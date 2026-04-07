package id.pintarai.app.localai

object NemotronPromptFormatter {
    fun build(systemPrompt: String, messages: List<LocalMessage>): String {
        val builder = StringBuilder()
        val system = systemPrompt.trim()

        if (system.isNotEmpty()) {
            builder.append("<extra_id_0>System\n")
            builder.append(system)
            builder.append("\n")
        }

        messages.forEach { message ->
            val role = if (message.role == "assistant") "Assistant" else "User"
            builder.append("<extra_id_1>")
            builder.append(role)
            builder.append("\n")
            builder.append(message.content.trim())
            builder.append("\n")
        }

        builder.append("<extra_id_1>Assistant\n")
        return builder.toString()
    }
}
