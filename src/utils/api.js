const BASE_URL = 'https://openrouter.ai/api/v1';

export function classifyError(errorMessage) {
  const msg = (errorMessage || '').toLowerCase();
  if (msg.includes('data policy') || msg.includes('privacy')) {
    return 'DATA_POLICY';
  }
  if (msg.includes('provider returned error') || msg.includes('provider error')) {
    return 'PROVIDER_DOWN';
  }
  if (msg.includes('rate limit') || msg.includes('429')) {
    return 'RATE_LIMITED';
  }
  return 'UNKNOWN';
}

function friendlyErrorMessage(rawMessage) {
  const type = classifyError(rawMessage);
  if (type === 'DATA_POLICY') {
    return 'Your OpenRouter privacy settings are blocking free models. Update your settings to continue.';
  }
  if (type === 'PROVIDER_DOWN') {
    return "This model's provider is currently unavailable. Try a different model or retry in a moment.";
  }
  if (type === 'RATE_LIMITED') {
    return 'Rate limited — please wait a moment and try again.';
  }
  return rawMessage;
}

export async function validateApiKey(apiKey) {
  try {
    const res = await fetch(`${BASE_URL}/auth/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.data ? true : false;
  } catch {
    return false;
  }
}

export async function fetchModels(apiKey) {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error('Failed to fetch models');
  const data = await res.json();
  return data.data || [];
}

export function filterFreeModels(models) {
  return models
    .filter((m) => {
      const promptPrice = parseFloat(m.pricing?.prompt || '1');
      const completionPrice = parseFloat(m.pricing?.completion || '1');
      return promptPrice === 0 && completionPrice === 0;
    })
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
}

export async function* streamChat(apiKey, model, messages, signal) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'CfIA Lab OS-LLM-UI',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = err?.error?.message || `API error: ${res.status}`;
    throw new Error(friendlyErrorMessage(raw));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]' || trimmed.startsWith(':')) continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function nonStreamChat(apiKey, model, messages, signal) {
  const startTime = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'CfIA Lab OS-LLM-UI',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal,
  });

  const latency = Date.now() - startTime;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = err?.error?.message || `API error: ${res.status}`;
    throw new Error(friendlyErrorMessage(raw));
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    latency,
  };
}
