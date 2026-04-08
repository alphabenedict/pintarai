package id.pintarai.app.localai

import org.json.JSONArray
import org.json.JSONObject

data class LocalMessage(
    val role: String,
    val content: String,
)

data class GenerationOptions(
    val temperature: Double = 0.7,
    val topP: Double = 0.9,
    val topK: Int = 40,
    val repetitionPenalty: Double = 1.05,
    val maxNewTokens: Int = 192,
    val contextWindow: Int? = null,
)

data class GenerationRequest(
    val requestId: String,
    val systemPrompt: String,
    val messages: List<LocalMessage>,
    val options: GenerationOptions = GenerationOptions(),
)

data class PrepareModelRequest(
    val modelId: String = "gemma4-e2b-int4",
    val assetManifestPath: String? = "public/local-ai/gemma4-e2b-int4/manifest.json",
    val remoteManifestUrl: String? = null,
    val forceReinstall: Boolean = false,
)

data class ManifestFile(
    val path: String,
    val sha256: String? = null,
    val sizeBytes: Long? = null,
    val url: String? = null,
)

data class ModelManifest(
    val id: String,
    val version: Int,
    val modelName: String,
    val entryFile: String,
    val tokenizerFile: String,
    val generationConfigFile: String? = null,
    val tokenizerConfigFile: String? = null,
    val chatTemplate: String = "gemma4-text",
    val bosTokenId: Int? = null,
    val eosTokenIds: List<Int> = listOf(1),
    val contextWindow: Int = 2048,
    val requiredRamMb: Long = 8192,
    val files: List<ManifestFile>,
) {
    companion object {
        fun fromJson(raw: String): ModelManifest {
            val json = JSONObject(raw)
            val filesArray = json.optJSONArray("files") ?: JSONArray()
            val files = buildList {
                for (index in 0 until filesArray.length()) {
                    val file = filesArray.getJSONObject(index)
                    add(
                        ManifestFile(
                            path = file.getString("path"),
                            sha256 = file.optStringOrNull("sha256"),
                            sizeBytes = file.optLongOrNull("sizeBytes"),
                            url = file.optStringOrNull("url"),
                        )
                    )
                }
            }

            return ModelManifest(
                id = json.optString("id", "gemma4-e2b-int4"),
                version = json.optInt("version", 1),
                modelName = json.optString("modelName", json.optString("id", "gemma4-e2b-int4")),
                entryFile = json.optString("entryFile", "decoder_model_merged.onnx"),
                tokenizerFile = json.optString("tokenizerFile", "tokenizer.json"),
                generationConfigFile = json.optStringOrNull("generationConfigFile"),
                tokenizerConfigFile = json.optStringOrNull("tokenizerConfigFile"),
                chatTemplate = json.optString("chatTemplate", "gemma4-text"),
                bosTokenId = json.optIntOrNull("bosTokenId"),
                eosTokenIds = json.optIntList("eosTokenIds").ifEmpty {
                    json.optIntOrNull("eosTokenId")?.let(::listOf) ?: listOf(1)
                },
                contextWindow = json.optInt("contextWindow", 2048),
                requiredRamMb = json.optLong("requiredRamMb", 8192L),
                files = files,
            )
        }
    }
}

data class PreparedModel(
    val rootDir: java.io.File,
    val manifest: ModelManifest,
)

data class LocalModelState(
    val status: String = "unloaded",
    val progress: Int = 0,
    val statusText: String = "AI lokal belum dimuat.",
    val error: String? = null,
    val modelName: String = "gemma4-e2b-int4",
    val provider: String? = null,
)

data class RuntimeStats(
    val modelId: String = "gemma4-e2b-int4",
    val provider: String = "unloaded",
    val contextWindow: Int = 0,
    val estimatedRamMb: Long = 0,
    val warm: Boolean = false,
    val totalGenerations: Long = 0,
    val lastTokensPerSecond: Double = 0.0,
    val lastLoadMs: Long = 0,
)

private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    return optString(key).takeIf { it.isNotBlank() }
}

private fun JSONObject.optLongOrNull(key: String): Long? {
    if (!has(key) || isNull(key)) return null
    return optLong(key)
}

private fun JSONObject.optIntOrNull(key: String): Int? {
    if (!has(key) || isNull(key)) return null
    return optInt(key)
}

private fun JSONObject.optIntList(key: String): List<Int> {
    val array = optJSONArray(key) ?: return emptyList()
    return buildList {
        for (index in 0 until array.length()) {
            add(array.getInt(index))
        }
    }
}
