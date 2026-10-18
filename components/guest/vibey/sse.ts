'use client';

// Reads a Server-Sent Events response from fetch (EventSource cannot POST). Calls onEvent(name, data) for each event.
export async function readSse(res: Response, onEvent: (event: string, data: any) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf('\n\n');
    while (cut >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1] ?? 'message';
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (data) {
        try { onEvent(event, JSON.parse(data)); } catch { /* a malformed event is skipped */ }
      }
      cut = buffer.indexOf('\n\n');
    }
  }
}
