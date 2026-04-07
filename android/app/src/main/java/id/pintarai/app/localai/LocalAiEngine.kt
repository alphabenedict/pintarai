package id.pintarai.app.localai

import ai.onnxruntime.NodeInfo
import ai.onnxruntime.OnnxJavaType
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtException
import ai.onnxruntime.OrtSession
import ai.onnxruntime.TensorInfo
import ai.onnxruntime.providers.NNAPIFlags
import android.app.ActivityManager
import android.content.Context
import android.os.Debug
import android.os.SystemClock
import java.io.Closeable
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.IntBuffer
import java.nio.LongBuffer
import java.util.EnumSet
import java.util.LinkedHashMap
import java.util.LinkedHashSet
import java.util.Random
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

class LocalAiEngine(
    private val context: Context,
    private val modelManager: ModelManager,
    private val emitState: (LocalModelState) -> Unit,
) : Closeable {
    private val env = OrtEnvironment.getEnvironment()
    private val lock = Any()
    private val random = Random()
    private val cancelRequested = AtomicBoolean(false)

    @Volatile
    private var session: OrtSession? = null

    @Volatile
    private var sessionOptions: OrtSession.SessionOptions? = null

    @Volatile
    private var tokenizer: TokenizerBridge? = null

    @Volatile
    private var preparedModel: PreparedModel? = null

    @Volatile
    private var contract: ModelContract? = null

    @Volatile
    private var deviceTier: DeviceTier = detectDeviceTier()

    @Volatile
    private var runtimeStats = RuntimeStats()

    fun prepareModel(request: PrepareModelRequest): LocalModelState {
        synchronized(lock) {
            val alreadyLoaded = preparedModel
            if (alreadyLoaded != null && session != null && !request.forceReinstall) {
                val currentState = LocalModelState(
                    status = "ready",
                    progress = 100,
                    statusText = "AI lokal siap!",
                    modelName = alreadyLoaded.manifest.modelName,
                    provider = runtimeStats.provider,
                )
                emitState(currentState)
                return currentState
            }

            val startedAt = SystemClock.elapsedRealtime()
            val prepared = modelManager.prepare(request, emitState)
            loadPreparedModel(prepared)

            runtimeStats = runtimeStats.copy(
                modelId = prepared.manifest.id,
                contextWindow = min(prepared.manifest.contextWindow, deviceTier.defaultContextWindow),
                estimatedRamMb = estimateUsedRamMb(),
                lastLoadMs = SystemClock.elapsedRealtime() - startedAt,
            )

            val ready = LocalModelState(
                status = "ready",
                progress = 100,
                statusText = "AI lokal siap!",
                modelName = prepared.manifest.modelName,
                provider = runtimeStats.provider,
            )
            emitState(ready)
            return ready
        }
    }

    fun generate(
        request: GenerationRequest,
        onToken: (String) -> Unit,
    ) {
        val activeSession = session ?: error("Model belum dimuat")
        val activeTokenizer = tokenizer ?: error("Tokenizer belum dimuat")
        val activePrepared = preparedModel ?: error("Model belum dimuat")
        val activeContract = contract ?: error("Kontrak model belum siap")

        cancelRequested.set(false)
        activeTokenizer.resetIncremental()

        val prompt = NemotronPromptFormatter.build(request.systemPrompt, request.messages)
        val promptTokens = activeTokenizer.encode(prompt, true).toMutableList()
        val targetContext = min(
            request.options.contextWindow ?: deviceTier.defaultContextWindow,
            activePrepared.manifest.contextWindow,
        ).coerceAtLeast(512)
        val maxNewTokens = min(request.options.maxNewTokens, deviceTier.maxNewTokens)

        val maxPromptTokens = (targetContext - maxNewTokens - 8).coerceAtLeast(128)
        if (promptTokens.size > maxPromptTokens) {
            val trimmed = promptTokens.takeLast(maxPromptTokens)
            promptTokens.clear()
            promptTokens.addAll(trimmed)
        }

        val activeTokens = promptTokens.toMutableList()
        var currentInput = promptTokens.toLongArray()
        var cache = emptyMap<String, TensorSnapshot>()
        var emittedTokens = 0
        val startedAt = SystemClock.elapsedRealtimeNanos()

        while (emittedTokens < maxNewTokens && !cancelRequested.get()) {
            val stepOutputs = runDecodeStep(
                session = activeSession,
                contract = activeContract,
                activeTokens = activeTokens,
                currentInput = currentInput,
                cache = cache,
            )

            val logits = stepOutputs.logits
            val nextToken = sampleNextToken(
                logits = logits,
                activeTokens = activeTokens,
                options = request.options,
            )

            if (activePrepared.manifest.eosTokenIds.contains(nextToken.toInt())) {
                break
            }

            if (activeTokens.size >= targetContext) {
                break
            }
            activeTokens.add(nextToken)

            cache = stepOutputs.cache
            currentInput = longArrayOf(nextToken)
            emittedTokens += 1

            val delta = activeTokenizer.decodeIncremental(nextToken)
            if (delta.isNotEmpty()) {
                onToken(delta)
            }
        }

        val elapsedNs = SystemClock.elapsedRealtimeNanos() - startedAt
        runtimeStats = runtimeStats.copy(
            warm = true,
            totalGenerations = runtimeStats.totalGenerations + 1,
            lastTokensPerSecond = if (elapsedNs <= 0L || emittedTokens == 0) {
                0.0
            } else {
                emittedTokens * 1_000_000_000.0 / elapsedNs.toDouble()
            },
            estimatedRamMb = estimateUsedRamMb(),
            contextWindow = targetContext,
        )
    }

    fun cancelGeneration() {
        cancelRequested.set(true)
    }

    fun isCancellationRequested(): Boolean = cancelRequested.get()

    fun getRuntimeStats(): RuntimeStats = runtimeStats

    override fun close() {
        synchronized(lock) {
            closeRuntime()
        }
    }

    private fun loadPreparedModel(prepared: PreparedModel) {
        closeRuntime()
        deviceTier = detectDeviceTier()

        emitState(
            LocalModelState(
                status = "loading",
                progress = 98,
                statusText = "Membuka model ONNX Runtime...",
                modelName = prepared.manifest.modelName,
            )
        )

        val tokenizerPath = File(prepared.rootDir, prepared.manifest.tokenizerFile).toPath()
        tokenizer = HuggingFaceTokenizerBridge(tokenizerPath)

        val modelPath = File(prepared.rootDir, prepared.manifest.entryFile)
        val (createdSession, provider, options) = createSession(modelPath)
        session = createdSession
        sessionOptions = options
        preparedModel = prepared
        contract = inspectContract(createdSession)

        emitState(
            LocalModelState(
                status = "loading",
                progress = 99,
                statusText = "Memanaskan sesi AI...",
                modelName = prepared.manifest.modelName,
                provider = provider,
            )
        )

        warmUp(prepared, provider)
        runtimeStats = runtimeStats.copy(
            modelId = prepared.manifest.id,
            provider = provider,
            warm = true,
        )
    }

    private fun warmUp(prepared: PreparedModel, provider: String) {
        val warmupTokenizer = tokenizer ?: return
        val warmupSession = session ?: return
        val warmupContract = contract ?: return

        try {
            warmupTokenizer.resetIncremental()
            val prompt = NemotronPromptFormatter.build(
                systemPrompt = "Kamu adalah PintarAI.",
                messages = listOf(LocalMessage(role = "user", content = "Halo")),
            )
            val promptTokens = warmupTokenizer.encode(prompt, true).toMutableList()
            if (promptTokens.isEmpty()) return

            var cache = emptyMap<String, TensorSnapshot>()
            var currentInput = promptTokens.toLongArray()
            val step = runDecodeStep(
                session = warmupSession,
                contract = warmupContract,
                activeTokens = promptTokens,
                currentInput = currentInput,
                cache = cache,
            )
            val next = sampleNextToken(
                logits = step.logits,
                activeTokens = promptTokens,
                options = GenerationOptions(
                    temperature = 0.0,
                    topP = 1.0,
                    topK = 1,
                    repetitionPenalty = 1.0,
                    maxNewTokens = 1,
                ),
            )
            if (!prepared.manifest.eosTokenIds.contains(next.toInt())) {
                cache = step.cache
                currentInput = longArrayOf(next)
                runDecodeStep(
                    session = warmupSession,
                    contract = warmupContract,
                    activeTokens = promptTokens.apply { add(next) },
                    currentInput = currentInput,
                    cache = cache,
                )
            }
            runtimeStats = runtimeStats.copy(provider = provider, warm = true)
        } catch (_: Throwable) {
            runtimeStats = runtimeStats.copy(provider = provider, warm = false)
        }
    }

    private fun createSession(modelPath: File): Triple<OrtSession, String, OrtSession.SessionOptions> {
        val useNnapi = deviceTier.tryNnapi
        if (useNnapi) {
            runCatching {
                val options = buildSessionOptions(useNnapi = true)
                val created = env.createSession(modelPath.absolutePath, options)
                Triple(created, "nnapi", options)
            }.getOrNull()?.let { return it }
        }

        val cpuOptions = buildSessionOptions(useNnapi = false)
        val created = env.createSession(modelPath.absolutePath, cpuOptions)
        val provider = if (deviceTier.preferXnnpack) "xnnpack" else "cpu"
        return Triple(created, provider, cpuOptions)
    }

    private fun buildSessionOptions(useNnapi: Boolean): OrtSession.SessionOptions {
        val options = OrtSession.SessionOptions()
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        options.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        options.setInterOpNumThreads(1)
        val intraThreads = min(4, max(1, Runtime.getRuntime().availableProcessors() - 1))
        options.setIntraOpNumThreads(intraThreads)

        if (useNnapi) {
            options.addNnapi(
                EnumSet.of(
                    NNAPIFlags.USE_FP16,
                    NNAPIFlags.CPU_DISABLED,
                )
            )
        } else if (deviceTier.preferXnnpack) {
            options.addXnnpack(mapOf("intra_op_num_threads" to intraThreads.toString()))
        }
        return options
    }

    private fun inspectContract(session: OrtSession): ModelContract {
        val inputTensorInfo = session.inputInfo.mapValues { (_, nodeInfo) ->
            (nodeInfo.valueInfo as? TensorInfo)
                ?: throw IllegalStateException("Input tensor info tidak valid")
        }
        val outputTensorInfo = session.outputInfo.mapValues { (_, nodeInfo) ->
            (nodeInfo.valueInfo as? TensorInfo)
                ?: throw IllegalStateException("Output tensor info tidak valid")
        }

        val inputNames = inputTensorInfo.keys
        val outputNames = outputTensorInfo.keys

        val logitsName = outputNames.find { it == "logits" || it.endsWith("/logits") }
            ?: outputNames.firstOrNull { it.contains("logits", ignoreCase = true) }
            ?: throw IllegalStateException("Output logits tidak ditemukan.")

        val pastInputs = inputNames.filter { it.startsWith("past_key_values.") }.sorted()
        val presentOutputs = outputNames.filter {
            it.startsWith("present.") || it.startsWith("past_key_values_out.")
        }.sorted()

        return ModelContract(
            inputTensorInfo = inputTensorInfo,
            outputTensorInfo = outputTensorInfo,
            inputIdsName = findName(inputNames, "input_ids") ?: throw IllegalStateException("input_ids tidak ditemukan"),
            attentionMaskName = findName(inputNames, "attention_mask"),
            positionIdsName = findName(inputNames, "position_ids"),
            cachePositionName = findName(inputNames, "cache_position"),
            useCacheBranchName = findName(inputNames, "use_cache_branch"),
            logitsName = logitsName,
            pastInputNames = pastInputs,
            presentOutputNames = presentOutputs,
        )
    }

    private fun runDecodeStep(
        session: OrtSession,
        contract: ModelContract,
        activeTokens: List<Long>,
        currentInput: LongArray,
        cache: Map<String, TensorSnapshot>,
    ): StepOutputs {
        val tensors = LinkedHashMap<String, OnnxTensor>()
        try {
            val totalSequenceLength = activeTokens.size
            tensors[contract.inputIdsName] = createIntegerTensor(
                info = contract.inputTensorInfo.getValue(contract.inputIdsName),
                values = currentInput,
                shape = shapeForSequenceInput(contract.inputTensorInfo.getValue(contract.inputIdsName), currentInput.size),
            )

            contract.attentionMaskName?.let { name ->
                val values = LongArray(totalSequenceLength) { 1L }
                val info = contract.inputTensorInfo.getValue(name)
                tensors[name] = createIntegerTensor(
                    info = info,
                    values = values,
                    shape = shapeForSequenceInput(info, totalSequenceLength),
                )
            }

            val pastLength = totalSequenceLength - currentInput.size

            contract.positionIdsName?.let { name ->
                val info = contract.inputTensorInfo.getValue(name)
                val values = LongArray(currentInput.size) { index -> (pastLength + index).toLong() }
                tensors[name] = createIntegerTensor(
                    info = info,
                    values = values,
                    shape = shapeForSequenceInput(info, currentInput.size),
                )
            }

            contract.cachePositionName?.let { name ->
                val info = contract.inputTensorInfo.getValue(name)
                val values = LongArray(currentInput.size) { index -> (pastLength + index).toLong() }
                tensors[name] = createIntegerTensor(
                    info = info,
                    values = values,
                    shape = shapeForFlexibleInput(info, currentInput.size),
                )
            }

            contract.useCacheBranchName?.let { name ->
                val info = contract.inputTensorInfo.getValue(name)
                tensors[name] = createBooleanTensor(
                    info = info,
                    value = cache.isNotEmpty(),
                )
            }

            contract.pastInputNames.forEach { name ->
                val tensorInfo = contract.inputTensorInfo.getValue(name)
                val snapshot = cache[name]
                tensors[name] = snapshot?.toTensor(env) ?: createEmptyTensor(tensorInfo)
            }

            val requestedOutputs = LinkedHashSet<String>().apply {
                add(contract.logitsName)
                addAll(contract.presentOutputNames)
            }

            session.run(tensors, requestedOutputs).use { result ->
                val logitsTensor = result[contract.logitsName] as? OnnxTensor
                    ?: throw IllegalStateException("Tensor logits tidak tersedia.")
                val cacheSnapshots = collectCacheSnapshots(result, contract)
                val logits = extractLastLogits(logitsTensor)
                return StepOutputs(logits = logits, cache = cacheSnapshots)
            }
        } finally {
            tensors.values.forEach { value ->
                runCatching { value.close() }
            }
        }
    }

    private fun collectCacheSnapshots(
        result: OrtSession.Result,
        contract: ModelContract,
    ): Map<String, TensorSnapshot> {
        if (contract.pastInputNames.isEmpty() || contract.presentOutputNames.isEmpty()) {
            return emptyMap()
        }

        return contract.pastInputNames.zip(contract.presentOutputNames).associate { (pastName, presentName) ->
            val tensor = result[presentName] as? OnnxTensor
                ?: throw IllegalStateException("Output cache tidak tersedia: $presentName")
            pastName to TensorSnapshot.fromTensor(tensor)
        }
    }

    private fun extractLastLogits(logitsTensor: OnnxTensor): FloatArray {
        val info = logitsTensor.info as TensorInfo
        val shape = info.shape
        val logitsBuffer = logitsTensor.floatBuffer
        val allLogits = FloatArray(logitsBuffer.remaining())
        logitsBuffer.get(allLogits)

        val vocabSize = when {
            shape.isNotEmpty() && shape.last() > 0 -> shape.last().toInt()
            else -> allLogits.size
        }
        return if (allLogits.size <= vocabSize) {
            allLogits
        } else {
            allLogits.copyOfRange(allLogits.size - vocabSize, allLogits.size)
        }
    }

    private fun sampleNextToken(
        logits: FloatArray,
        activeTokens: List<Long>,
        options: GenerationOptions,
    ): Long {
        val working = logits.copyOf()
        if (options.repetitionPenalty > 1.0) {
            activeTokens.toSet().forEach { token ->
                val index = token.toInt()
                if (index in working.indices) {
                    val value = working[index]
                    working[index] = if (value < 0f) {
                        (value * options.repetitionPenalty).toFloat()
                    } else {
                        (value / options.repetitionPenalty).toFloat()
                    }
                }
            }
        }

        if (options.temperature <= 0.0001 || options.topK <= 1) {
            return working.indices.maxByOrNull { working[it] }?.toLong()
                ?: 0L
        }

        val topK = min(options.topK.coerceAtLeast(1), working.size)
        val candidateIndices = IntArray(topK) { -1 }
        val candidateValues = FloatArray(topK) { Float.NEGATIVE_INFINITY }

        working.forEachIndexed { index, value ->
            var minSlot = 0
            for (slot in 1 until topK) {
                if (candidateValues[slot] < candidateValues[minSlot]) {
                    minSlot = slot
                }
            }
            if (value > candidateValues[minSlot]) {
                candidateValues[minSlot] = value
                candidateIndices[minSlot] = index
            }
        }

        val sortedCandidates = buildList<Pair<Int, Float>> {
            for (slot in candidateIndices.indices) {
                val index = candidateIndices[slot]
                if (index >= 0) {
                    add(index to candidateValues[slot])
                }
            }
        }.sortedByDescending { it.second / options.temperature.toFloat() }

        val maxLogit = sortedCandidates.maxOf { it.second / options.temperature.toFloat() }
        val probabilities = ArrayList<Pair<Int, Double>>(sortedCandidates.size)
        var partitionSum = 0.0
        for ((index, value) in sortedCandidates) {
            val probability = exp(((value / options.temperature.toFloat()) - maxLogit).toDouble())
            partitionSum += probability
            probabilities += index to probability
        }

        probabilities.sortByDescending { it.second }
        val filtered = ArrayList<Pair<Int, Double>>(probabilities.size)
        var runningMass = 0.0
        for ((index, score) in probabilities) {
            val normalized = score / partitionSum
            filtered += index to normalized
            runningMass += normalized
            if (runningMass >= options.topP) {
                break
            }
        }

        val threshold = random.nextDouble() * filtered.sumOf { it.second }
        var cursor = 0.0
        filtered.forEach { (index, probability) ->
            cursor += probability
            if (threshold <= cursor) {
                return index.toLong()
            }
        }

        return filtered.lastOrNull()?.first?.toLong()
            ?: sortedCandidates.firstOrNull()?.first?.toLong()
            ?: 0L
    }

    private fun createIntegerTensor(
        info: TensorInfo,
        values: LongArray,
        shape: LongArray,
    ): OnnxTensor {
        return when (info.type) {
            OnnxJavaType.INT32 -> {
                val buffer = ByteBuffer.allocateDirect(values.size * Int.SIZE_BYTES).order(ByteOrder.nativeOrder())
                val intBuffer = buffer.asIntBuffer()
                values.forEach { intBuffer.put(it.toInt()) }
                intBuffer.rewind()
                OnnxTensor.createTensor(env, buffer, shape, OnnxJavaType.INT32)
            }

            else -> {
                val buffer = ByteBuffer.allocateDirect(values.size * Long.SIZE_BYTES).order(ByteOrder.nativeOrder())
                val longBuffer = buffer.asLongBuffer()
                values.forEach { longBuffer.put(it) }
                longBuffer.rewind()
                OnnxTensor.createTensor(env, buffer, shape, OnnxJavaType.INT64)
            }
        }
    }

    private fun createBooleanTensor(
        info: TensorInfo,
        value: Boolean,
    ): OnnxTensor {
        val shape = if (info.shape.isEmpty()) longArrayOf() else shapeForFlexibleInput(info, 1)
        val buffer = ByteBuffer.allocateDirect(1).order(ByteOrder.nativeOrder())
        buffer.put(if (value) 1 else 0)
        buffer.rewind()
        return OnnxTensor.createTensor(env, buffer, shape, OnnxJavaType.BOOL)
    }

    private fun createEmptyTensor(info: TensorInfo): OnnxTensor {
        val shape = LongArray(info.shape.size) { index ->
            val dim = info.shape[index]
            when {
                dim > 0L -> dim
                index == 0 -> 1L
                else -> 0L
            }
        }
        val buffer = ByteBuffer.allocateDirect(0).order(ByteOrder.nativeOrder())
        return OnnxTensor.createTensor(env, buffer, shape, info.type)
    }

    private fun shapeForSequenceInput(info: TensorInfo, tokenCount: Int): LongArray {
        if (info.shape.isEmpty()) return longArrayOf()
        return when (info.shape.size) {
            1 -> longArrayOf(tokenCount.toLong())
            else -> longArrayOf(1L, tokenCount.toLong())
        }
    }

    private fun shapeForFlexibleInput(info: TensorInfo, elementCount: Int): LongArray {
        if (info.shape.isEmpty()) return longArrayOf()
        return LongArray(info.shape.size) { index ->
            val dim = info.shape[index]
            when {
                dim > 0L -> dim
                info.shape.size == 1 -> elementCount.toLong()
                index == 0 -> 1L
                index == info.shape.lastIndex -> elementCount.toLong()
                else -> 1L
            }
        }
    }

    private fun estimateUsedRamMb(): Long {
        val memoryInfo = Debug.MemoryInfo()
        Debug.getMemoryInfo(memoryInfo)
        return memoryInfo.totalPss.toLong() / 1024L
    }

    private fun detectDeviceTier(): DeviceTier {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        val totalRamMb = memoryInfo.totalMem / (1024L * 1024L)
        val processors = Runtime.getRuntime().availableProcessors()
        val tryNnapi = totalRamMb >= 8192L
        return when {
            totalRamMb >= 12_288L && processors >= 8 -> {
                DeviceTier(
                    totalRamMb = totalRamMb,
                    defaultContextWindow = 4096,
                    maxNewTokens = 256,
                    tryNnapi = tryNnapi,
                    preferXnnpack = true,
                )
            }

            totalRamMb >= 8192L -> {
                DeviceTier(
                    totalRamMb = totalRamMb,
                    defaultContextWindow = 2048,
                    maxNewTokens = 192,
                    tryNnapi = tryNnapi,
                    preferXnnpack = true,
                )
            }

            else -> {
                DeviceTier(
                    totalRamMb = totalRamMb,
                    defaultContextWindow = 1024,
                    maxNewTokens = 128,
                    tryNnapi = false,
                    preferXnnpack = true,
                )
            }
        }
    }

    private fun closeRuntime() {
        runCatching { tokenizer?.close() }
        tokenizer = null
        runCatching { session?.close() }
        session = null
        runCatching { sessionOptions?.close() }
        sessionOptions = null
        contract = null
        preparedModel = null
    }

    private fun findName(names: Set<String>, exact: String): String? {
        return names.find { it == exact }
            ?: names.find { it.endsWith("/$exact") }
            ?: names.find { it.contains(exact, ignoreCase = true) }
    }

    private val NodeInfo.valueInfo: Any
        get() = info
}

private data class DeviceTier(
    val totalRamMb: Long,
    val defaultContextWindow: Int,
    val maxNewTokens: Int,
    val tryNnapi: Boolean,
    val preferXnnpack: Boolean,
)

private data class ModelContract(
    val inputTensorInfo: Map<String, TensorInfo>,
    val outputTensorInfo: Map<String, TensorInfo>,
    val inputIdsName: String,
    val attentionMaskName: String?,
    val positionIdsName: String?,
    val cachePositionName: String?,
    val useCacheBranchName: String?,
    val logitsName: String,
    val pastInputNames: List<String>,
    val presentOutputNames: List<String>,
)

private data class StepOutputs(
    val logits: FloatArray,
    val cache: Map<String, TensorSnapshot>,
)

private data class TensorSnapshot(
    val shape: LongArray,
    val type: OnnxJavaType,
    val bytes: ByteArray,
) {
    fun toTensor(environment: OrtEnvironment): OnnxTensor {
        val buffer = ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder())
        buffer.put(bytes)
        buffer.rewind()
        return OnnxTensor.createTensor(environment, buffer, shape, type)
    }

    companion object {
        fun fromTensor(tensor: OnnxTensor): TensorSnapshot {
            val info = tensor.info as TensorInfo
            val byteBuffer = tensor.byteBuffer
            val bytes = ByteArray(byteBuffer.remaining())
            byteBuffer.get(bytes)
            byteBuffer.rewind()
            return TensorSnapshot(
                shape = info.shape.clone(),
                type = info.type,
                bytes = bytes,
            )
        }
    }
}
