package id.pintarai.app.localai

import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.UUID
import java.util.concurrent.Executors

@CapacitorPlugin(name = "LocalAi")
class LocalAiPlugin : Plugin() {
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var engine: LocalAiEngine

    override fun load() {
        val applicationContext = context.applicationContext
        engine = LocalAiEngine(
            context = applicationContext,
            emitState = { state -> emitStatus(state) },
        )
    }

    @PluginMethod
    fun prepareModel(call: PluginCall) {
        val request = PrepareModelRequest(
            modelId = call.getString("modelId") ?: "gemma4-e2b-int4",
            assetManifestPath = call.getString("assetManifestPath")
                ?: "public/local-ai/gemma4-e2b-int4/manifest.json",
            remoteManifestUrl = call.getString("remoteManifestUrl"),
            forceReinstall = call.getBoolean("forceReinstall", false) ?: false,
        )

        executor.execute {
            runCatching {
                val state = engine.prepareModel(request)
                resolveOnMain(call, stateToJs(state))
            }.onFailure { error ->
                emitError(
                    requestId = null,
                    message = error.message ?: "Gagal mempersiapkan AI lokal.",
                )
                rejectOnMain(call, error.message ?: "Gagal mempersiapkan AI lokal.")
            }
        }
    }

    @PluginMethod
    fun generateStream(call: PluginCall) {
        val requestId = call.getString("requestId") ?: UUID.randomUUID().toString()
        val generationRequest = GenerationRequest(
            requestId = requestId,
            systemPrompt = call.getString("systemPrompt") ?: "",
            messages = parseMessages(call.getArray("messages")),
            options = GenerationOptions(
                temperature = call.getDouble("temperature", 0.7) ?: 0.7,
                topP = call.getDouble("topP", 0.9) ?: 0.9,
                topK = call.getInt("topK", 40) ?: 40,
                repetitionPenalty = call.getDouble("repetitionPenalty", 1.05) ?: 1.05,
                maxNewTokens = call.getInt("maxNewTokens", 192) ?: 192,
                contextWindow = call.getInt("contextWindow"),
            ),
        )

        resolveOnMain(call, JSObject().put("requestId", requestId))

        executor.execute {
            runCatching {
                engine.generate(
                    request = generationRequest,
                    onToken = { chunk -> emitToken(requestId, chunk) },
                    onComplete = { cancelled: Boolean -> emitComplete(requestId, cancelled) }
                )
            }.onFailure { error ->
                emitError(
                    requestId = requestId,
                    message = error.message ?: "Inferensi AI lokal gagal.",
                )
            }
        }
    }

    @PluginMethod
    fun cancelGeneration(call: PluginCall) {
        engine.cancelGeneration()
        resolveOnMain(call, JSObject())
    }

    @PluginMethod
    fun getRuntimeStats(call: PluginCall) {
        resolveOnMain(call, runtimeStatsToJs(engine.getRuntimeStats()))
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        engine.close()
        executor.shutdownNow()
    }

    private fun parseMessages(array: JSArray?): List<LocalMessage> {
        if (array == null) return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    LocalMessage(
                        role = item.optString("role", "user"),
                        content = item.optString("content", ""),
                    )
                )
            }
        }
    }

    private fun emitStatus(state: LocalModelState) {
        notifyOnMain("localAiStatus", stateToJs(state))
    }

    private fun emitToken(requestId: String, token: String) {
        notifyOnMain(
            "localAiToken",
            JSObject()
                .put("requestId", requestId)
                .put("chunk", token),
        )
    }

    private fun emitComplete(requestId: String, cancelled: Boolean) {
        notifyOnMain(
            "localAiComplete",
            JSObject()
                .put("requestId", requestId)
                .put("cancelled", cancelled)
                .put("stats", runtimeStatsToJs(engine.getRuntimeStats())),
        )
    }

    private fun emitError(requestId: String?, message: String) {
        val payload = JSObject().put("message", message)
        if (requestId != null) {
            payload.put("requestId", requestId)
        }
        notifyOnMain("localAiError", payload)
    }

    private fun stateToJs(state: LocalModelState): JSObject {
        return JSObject()
            .put("status", state.status)
            .put("progress", state.progress)
            .put("statusText", state.statusText)
            .put("error", state.error)
            .put("modelName", state.modelName)
            .put("provider", state.provider)
    }

    private fun runtimeStatsToJs(stats: RuntimeStats): JSObject {
        return JSObject()
            .put("modelId", stats.modelId)
            .put("provider", stats.provider)
            .put("contextWindow", stats.contextWindow)
            .put("estimatedRamMb", stats.estimatedRamMb)
            .put("warm", stats.warm)
            .put("totalGenerations", stats.totalGenerations)
            .put("lastTokensPerSecond", stats.lastTokensPerSecond)
            .put("lastLoadMs", stats.lastLoadMs)
    }

    private fun notifyOnMain(eventName: String, data: JSObject) {
        mainHandler.post {
            notifyListeners(eventName, data)
        }
    }

    private fun resolveOnMain(call: PluginCall, data: JSObject) {
        mainHandler.post { call.resolve(data) }
    }

    private fun rejectOnMain(call: PluginCall, message: String) {
        mainHandler.post { call.reject(message) }
    }
}
