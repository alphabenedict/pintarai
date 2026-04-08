package id.pintarai.app.localai

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class ModelManager(
    private val context: Context,
) {
    fun prepare(
        request: PrepareModelRequest,
        emit: (LocalModelState) -> Unit,
    ): PreparedModel {
        emit(
            LocalModelState(
                status = "loading",
                progress = 3,
                statusText = "Memeriksa model lokal...",
                modelName = request.modelId,
            )
        )

        val modelRoot = File(context.filesDir, "models/${request.modelId}")
        val existingManifestFile = File(modelRoot, "manifest.json")

        if (!request.forceReinstall && existingManifestFile.exists()) {
            val manifest = ModelManifest.fromJson(existingManifestFile.readText())
            verifyInstalledFiles(modelRoot, manifest, emit)
            return PreparedModel(modelRoot, manifest)
        }

        val tempRoot = File(modelRoot.parentFile, "${modelRoot.name}.tmp")
        deleteRecursively(tempRoot)
        tempRoot.mkdirs()

        val installed = when {
            !request.remoteManifestUrl.isNullOrBlank() -> {
                installFromRemote(request, tempRoot, emit)
            }

            !request.assetManifestPath.isNullOrBlank() && assetExists(request.assetManifestPath) -> {
                installFromAssets(request, tempRoot, emit)
            }

            existingManifestFile.exists() -> {
                val manifest = ModelManifest.fromJson(existingManifestFile.readText())
                verifyInstalledFiles(modelRoot, manifest, emit)
                PreparedModel(modelRoot, manifest)
            }

            else -> {
                throw IllegalStateException(
                    "Model Gemma 4 belum tersedia. Jalankan `npm run prepare-android` untuk sideload lokal " +
                        "atau setel VITE_ANDROID_LOCAL_AI_MANIFEST_URL untuk pengunduhan produksi."
                )
            }
        }

        deleteRecursively(modelRoot)
        if (!tempRoot.renameTo(modelRoot)) {
            deleteRecursively(modelRoot)
            tempRoot.copyRecursively(modelRoot, overwrite = true)
            deleteRecursively(tempRoot)
        }

        emit(
            LocalModelState(
                status = "loading",
                progress = 95,
                statusText = "Memverifikasi model...",
                modelName = installed.manifest.modelName,
            )
        )

        verifyInstalledFiles(modelRoot, installed.manifest, emit)
        return PreparedModel(modelRoot, installed.manifest)
    }

    private fun installFromAssets(
        request: PrepareModelRequest,
        tempRoot: File,
        emit: (LocalModelState) -> Unit,
    ): PreparedModel {
        val manifestPath = request.assetManifestPath ?: error("Asset manifest path missing")
        emit(
            LocalModelState(
                status = "loading",
                progress = 10,
                statusText = "Menyalin model offline dari paket aplikasi...",
                modelName = request.modelId,
            )
        )

        val rawManifest = context.assets.open(manifestPath).bufferedReader().use { it.readText() }
        val manifest = ModelManifest.fromJson(rawManifest)
        val assetBase = manifestPath.substringBeforeLast('/', "")
        val totalBytes = manifest.files.sumOf { it.sizeBytes ?: 0L }.coerceAtLeast(1L)
        var copiedBytes = 0L

        manifest.files.forEach { file ->
            val destination = File(tempRoot, file.path)
            destination.parentFile?.mkdirs()
            context.assets.open("$assetBase/${file.path}").use { input ->
                FileOutputStream(destination).use { output ->
                    copiedBytes += copyStream(input, output)
                }
            }
            val progress = 10 + ((copiedBytes.toDouble() / totalBytes.toDouble()) * 70).toInt().coerceIn(0, 70)
            emit(
                LocalModelState(
                    status = "loading",
                    progress = progress,
                    statusText = "Menyalin ${file.path}",
                    modelName = manifest.modelName,
                )
            )
        }

        File(tempRoot, "manifest.json").writeText(rawManifest)
        return PreparedModel(tempRoot, manifest)
    }

    private fun installFromRemote(
        request: PrepareModelRequest,
        tempRoot: File,
        emit: (LocalModelState) -> Unit,
    ): PreparedModel {
        val manifestUrl = request.remoteManifestUrl ?: error("Remote manifest URL missing")
        emit(
            LocalModelState(
                status = "loading",
                progress = 8,
                statusText = "Mengunduh manifest model...",
                modelName = request.modelId,
            )
        )

        val rawManifest = downloadText(manifestUrl)
        val manifest = ModelManifest.fromJson(rawManifest)
        val baseUrl = manifestUrl.substringBeforeLast('/')
        val totalBytes = manifest.files.sumOf { it.sizeBytes ?: 0L }.coerceAtLeast(1L)
        var downloadedBytes = 0L

        manifest.files.forEach { file ->
            val target = File(tempRoot, file.path)
            target.parentFile?.mkdirs()
            val fileUrl = file.url ?: "$baseUrl/${file.path.replace("\\", "/")}"
            downloadFile(fileUrl, target) { completed ->
                val effectiveCompleted = downloadedBytes + completed
                val progress = 12 + ((effectiveCompleted.toDouble() / totalBytes.toDouble()) * 70).toInt().coerceIn(0, 70)
                emit(
                    LocalModelState(
                        status = "loading",
                        progress = progress,
                        statusText = "Mengunduh ${file.path}",
                        modelName = manifest.modelName,
                    )
                )
            }
            downloadedBytes += file.sizeBytes ?: target.length()
        }

        File(tempRoot, "manifest.json").writeText(rawManifest)
        return PreparedModel(tempRoot, manifest)
    }

    private fun verifyInstalledFiles(
        modelRoot: File,
        manifest: ModelManifest,
        emit: (LocalModelState) -> Unit,
    ) {
        val total = manifest.files.size.coerceAtLeast(1)
        manifest.files.forEachIndexed { index, file ->
            val target = File(modelRoot, file.path)
            if (!target.exists()) {
                throw IllegalStateException("File model hilang: ${file.path}")
            }
            file.sha256?.let { expected ->
                val actual = sha256(target)
                if (!actual.equals(expected, ignoreCase = true)) {
                    throw IllegalStateException("Checksum tidak cocok untuk ${file.path}")
                }
            }
            val progress = 95 + (((index + 1).toDouble() / total.toDouble()) * 5).toInt().coerceIn(0, 5)
            emit(
                LocalModelState(
                    status = "loading",
                    progress = progress.coerceAtMost(100),
                    statusText = "Memverifikasi ${file.path}",
                    modelName = manifest.modelName,
                )
            )
        }
    }

    private fun assetExists(path: String): Boolean {
        return runCatching {
            context.assets.open(path).use { }
            true
        }.getOrDefault(false)
    }

    private fun downloadText(url: String): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 60_000
        connection.requestMethod = "GET"
        connection.instanceFollowRedirects = true
        return connection.inputStream.bufferedReader().use { it.readText() }.also {
            connection.disconnect()
        }
    }

    private fun downloadFile(
        url: String,
        target: File,
        onProgress: (Long) -> Unit,
    ) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 120_000
        connection.requestMethod = "GET"
        connection.instanceFollowRedirects = true

        connection.inputStream.use { input ->
            FileOutputStream(target).use { output ->
                copyStream(input, output, onProgress)
            }
        }
        connection.disconnect()
    }

    private fun copyStream(
        input: InputStream,
        output: FileOutputStream,
        onProgress: ((Long) -> Unit)? = null,
    ): Long {
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var total = 0L
        while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            total += read
            onProgress?.invoke(total)
        }
        return total
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = input.read(buffer)
                if (read < 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun deleteRecursively(file: File) {
        if (!file.exists()) return
        file.walkBottomUp().forEach { entry ->
            if (!entry.delete()) {
                entry.deleteOnExit()
            }
        }
    }
}
