const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Fast, multilingual, free tier: 14,400 req/day
const GROQ_MODEL = 'llama-3.1-8b-instant';

const KEY = 'pintarai_groq_key';

export function getGroqKey(): string | null {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setGroqKey(key: string): void {
  localStorage.setItem(KEY, key.trim());
}

export function clearGroqKey(): void {
  localStorage.removeItem(KEY);
}

export function isGroqReady(): boolean {
  return !!getGroqKey() && typeof navigator !== 'undefined' && navigator.onLine;
}

export async function* groqChat(
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  const key = getGroqKey();
  if (!key) throw new Error('No Groq API key');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 120)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const json = JSON.parse(raw);
        const text: string | undefined = json.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch { /* skip malformed chunk */ }
    }
  }
}
