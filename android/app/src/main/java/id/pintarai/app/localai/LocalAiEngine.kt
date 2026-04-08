package id.pintarai.app.localai

import android.content.Context
import android.os.Debug
import android.os.SystemClock
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.runBlocking
import java.io.Closeable
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

private const val MODEL_FILENAME = "gemma-4-E2B-it.litertlm"
private const val MODEL_DISPLAY_NAME = "Gemma-4-E2B"
// Fallback used only when Content-Length header is absent
private const val MODEL_SIZE_FALLBACK_BYTES = 2_580_000_000L
private const val HF_DOWNLOAD_URL =
    "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm"

class LocalAiEngine(
    private val context: Context,
    private val emitState: (LocalModelState) -> Unit,
) : Closeable {

    private val lock = Any()
    private val cancelRequested = AtomicBoolean(false)

    @Volatile private var liteRtEngine: Engine? = null
    @Volatile private var runtimeStats = RuntimeStats()

    // ---------------------------------------------------------------------------
    // Model preparation
    // ---------------------------------------------------------------------------

    fun prepareModel(request: PrepareModelRequest): LocalModelState {
        synchronized(lock) {
            val startedAt = SystemClock.elapsedRealtime()
            closeRuntime()

            val modelFile = modelFile()
            if (!modelFile.exists()) {
                downloadModel(modelFile)
            }

            emitState(
                LocalModelState(
                    status = "loading",
                    progress = 90,
                    statusText = "Memuat Gemma 4 ke GPU...",
                    modelName = MODEL_DISPLAY_NAME,
                )
            )

            return try {
                val config = EngineConfig(
                    modelPath = modelFile.absolutePath,
                    backend = Backend.GPU(),
                )
                liteRtEngine = Engine(config)
                liteRtEngine!!.initialize()

                runtimeStats = runtimeStats.copy(
                    modelId = request.modelId,
                    provider = "litert-gpu",
                    estimatedRamMb = estimateUsedRamMb(),
                    lastLoadMs = SystemClock.elapsedRealtime() - startedAt,
                    warm = true,
                )

                LocalModelState(
                    status = "ready",
                    progress = 100,
                    statusText = "AI siap! (Gemma 4 GPU)",
                    modelName = MODEL_DISPLAY_NAME,
                    provider = "litert-gpu",
                ).also { emitState(it) }

            } catch (e: Exception) {
                val err = LocalModelState(
                    status = "error",
                    progress = 0,
                    statusText = "Gagal memuat model Gemma 4",
                    modelName = MODEL_DISPLAY_NAME,
                    error = e.message,
                )
                emitState(err)
                throw e
            }
        }
    }

    private fun modelFile(): File {
        val dir = File(context.filesDir, "models")
        dir.mkdirs()
        return File(dir, MODEL_FILENAME)
    }

    private fun downloadModel(modelFile: File) {
        val tempFile = File(modelFile.parentFile, "$MODEL_FILENAME.tmp")
        val maxRetries = 10

        emitState(
            LocalModelState(
                status = "loading",
                progress = 5,
                statusText = "Mengunduh Gemma 4 (2.58GB) — pertama kali saja...",
                modelName = MODEL_DISPLAY_NAME,
            )
        )

        // Get total size with a HEAD request first
        val totalBytes = try {
            val head = URL(HF_DOWNLOAD_URL).openConnection() as HttpURLConnection
            head.requestMethod = "HEAD"
            head.instanceFollowRedirects = true
            head.connectTimeout = 30_000
            head.connect()
            val len = head.contentLengthLong
            head.disconnect()
            if (len > 0) len else MODEL_SIZE_FALLBACK_BYTES
        } catch (_: Exception) {
            MODEL_SIZE_FALLBACK_BYTES
        }

        for (attempt in 1..maxRetries) {
            val existingBytes = if (tempFile.exists()) tempFile.length() else 0L

            // If we already have it all, just rename
            if (existingBytes >= totalBytes) break

            val connection = URL(HF_DOWNLOAD_URL).openConnection() as HttpURLConnection
            connection.connectTimeout = 30_000
            connection.readTimeout = 120_000
            connection.requestMethod = "GET"
            connection.instanceFollowRedirects = true

            // Resume from where we left off
            if (existingBytes > 0L) {
                connection.setRequestProperty("Range", "bytes=$existingBytes-")
            }

            try {
                val responseCode = connection.responseCode

                // 416 = Range Not Satisfiable (file already complete)
                if (responseCode == 416) break

                val append = responseCode == 206 && existingBytes > 0L

                connection.inputStream.use { input ->
                    FileOutputStream(tempFile, append).use { output ->
                        val buffer = ByteArray(131_072) // 128KB buffer
                        var downloaded = if (append) existingBytes else 0L

                        while (true) {
                            val read = input.read(buffer)
                            if (read < 0) break
                            output.write(buffer, 0, read)
                            downloaded += read

                            val pct = (5 + (downloaded.toDouble() / totalBytes * 80).toInt())
                                .coerceIn(5, 85)
                            val mb = downloaded / 1_048_576
                            val totalMb = totalBytes / 1_048_576
                            emitState(
                                LocalModelState(
                                    status = "loading",
                                    progress = pct,
                                    statusText = "Mengunduh Gemma 4: ${mb}/${totalMb}MB",
                                    modelName = MODEL_DISPLAY_NAME,
                                )
                            )
                        }
                    }
                }

                // Download completed successfully
                break

            } catch (e: Exception) {
                connection.disconnect()
                val currentBytes = if (tempFile.exists()) tempFile.length() else 0L
                if (attempt >= maxRetries) {
                    tempFile.delete()
                    throw e
                }
                // Retry with backoff — keep the temp file for resume
                val waitSec = (attempt * 2).coerceAtMost(10)
                emitState(
                    LocalModelState(
                        status = "loading",
                        progress = (5 + (currentBytes.toDouble() / totalBytes * 80).toInt())
                            .coerceIn(5, 85),
                        statusText = "Koneksi terputus. Mencoba ulang dalam ${waitSec}s... (${currentBytes / 1_048_576}MB tersimpan)",
                        modelName = MODEL_DISPLAY_NAME,
                    )
                )
                Thread.sleep(waitSec * 1000L)
            }
        }

        if (!tempFile.renameTo(modelFile)) {
            tempFile.copyTo(modelFile, overwrite = true)
            tempFile.delete()
        }
    }

    // ---------------------------------------------------------------------------
    // Inference
    // ---------------------------------------------------------------------------

    fun generate(
        request: GenerationRequest,
        onToken: (String) -> Unit,
        onComplete: (Boolean) -> Unit,
    ) {
        val activeEngine = liteRtEngine ?: error("Model belum dimuat")
        cancelRequested.set(false)

        val opts = request.options
        val systemText = request.systemPrompt.takeIf { it.isNotBlank() } ?: ""
        val lastUserMsg = request.messages.lastOrNull { it.role == "user" }?.content ?: ""

        val convConfig = ConversationConfig(
            systemInstruction = Contents.of(systemText),
            samplerConfig = SamplerConfig(
                topK = opts.topK,
                topP = opts.topP,
                temperature = opts.temperature,
                seed = 0,
            ),
        )

        val conversation = activeEngine.createConversation(convConfig)
        val startedAt = SystemClock.elapsedRealtimeNanos()
        var emittedTokens = 0

        try {
            runBlocking {
                conversation.sendMessageAsync(lastUserMsg).collect { message ->
                    if (cancelRequested.get()) return@collect
                    val text = message.contents.contents
                        .filterIsInstance<Content.Text>()
                        .joinToString("") { it.text }
                    if (text.isNotEmpty()) {
                        emittedTokens++
                        onToken(text)
                    }
                }
            }
        } finally {
            val elapsedNs = SystemClock.elapsedRealtimeNanos() - startedAt
            runtimeStats = runtimeStats.copy(
                totalGenerations = runtimeStats.totalGenerations + 1,
                lastTokensPerSecond = if (elapsedNs <= 0L || emittedTokens == 0) 0.0
                    else emittedTokens * 1_000_000_000.0 / elapsedNs.toDouble(),
            )
            runCatching { conversation.close() }
            onComplete(cancelRequested.get())
        }
    }

    fun cancelGeneration() { cancelRequested.set(true) }
    fun isCancellationRequested(): Boolean = cancelRequested.get()
    fun getRuntimeStats(): RuntimeStats = runtimeStats

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    override fun close() = synchronized(lock) { closeRuntime() }

    private fun closeRuntime() {
        runCatching { liteRtEngine?.close() }
        liteRtEngine = null
    }

    private fun estimateUsedRamMb(): Long {
        val info = Debug.MemoryInfo()
        Debug.getMemoryInfo(info)
        return info.totalPss.toLong() / 1024L
    }
}
