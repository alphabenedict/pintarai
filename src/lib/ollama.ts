const OLLAMA_BASE = 'http://localhost:11434';

export async function checkOllamaStatus(): Promise<{ running: boolean; models: string[] }> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    const models = data.models?.map((m: { name: string }) => m.name) ?? [];
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}

export async function* streamChat(
  messages: { role: string; content: string }[],
  model: string,
  systemPrompt: string
): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!res.ok) throw new Error('Failed to connect to Ollama');
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) yield data.message.content;
      } catch {
        // Skip malformed lines
      }
    }
  }
}
