const BASE_URL = 'https://openrouter.ai/api/v1';

/* ───── Rate-limit tracking ───── */
let _rateLimit = { limit: null, remaining: null, resetTime: null };

function captureRateLimitHeaders(res) {
  const limit = res.headers.get('x-ratelimit-limit');
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (limit != null) _rateLimit.limit = parseInt(limit, 10);
  if (remaining != null) _rateLimit.remaining = parseInt(remaining, 10);
  if (reset != null) _rateLimit.resetTime = parseInt(reset, 10);
}

export function getRateLimitStatus() {
  return { ..._rateLimit };
}

/* ───── Error classification ───── */

export function classifyError(errorMessage) {
  const msg = (errorMessage || '').toLowerCase();
  if (msg.includes('data policy') || msg.includes('privacy')) {
    return 'DATA_POLICY';
  }
  if (msg.includes('provider returned error') || msg.includes('provider error') || msg.includes('502') || msg.includes('503')) {
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
    return 'Rate limited — free tier allows 20 requests/minute and 50/day. Please wait.';
  }
  return rawMessage;
}

/* ───── Health check ───── */

export async function checkModelEndpoints(apiKey, modelId) {
  // Strip :free suffix to get author/slug
  const slug = modelId.replace(/:free$/, '');
  try {
    const res = await fetch(`${BASE_URL}/models/${slug}/endpoints`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return 'unavailable';
    const data = await res.json();
    const endpoints = data?.data || data?.endpoints || [];
    return Array.isArray(endpoints) && endpoints.length > 0 ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/* ───── Proactive privacy check ───── */

export async function proactivePrivacyCheck(apiKey) {
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const raw = err?.error?.message || '';
      if (classifyError(raw) === 'DATA_POLICY') return 'DATA_POLICY';
    }
    return 'OK';
  } catch {
    return 'OK';
  }
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

  captureRateLimitHeaders(res);

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

  captureRateLimitHeaders(res);

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

/* ───── Retry-with-fallback wrappers ───── */

function isRetryableError(errMessage) {
  const t = classifyError(errMessage);
  return t === 'PROVIDER_DOWN';
}

/**
 * Streaming chat with auto-retry fallback.
 * @param {string} apiKey
 * @param {string} model - primary model
 * @param {Array} messages
 * @param {AbortSignal} signal
 * @param {string[]} fallbackModels - model IDs to try on provider failure
 * @param {function} onFallback - (failedModel, nextModel, error) => void
 */
export async function* streamChatWithRetry(apiKey, model, messages, signal, fallbackModels = [], onFallback) {
  const attempts = [model, ...fallbackModels.slice(0, 2)];
  for (let i = 0; i < attempts.length; i++) {
    try {
      yield* streamChat(apiKey, attempts[i], messages, signal);
      return; // success
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      // Not retryable (data policy, rate limit) or last attempt → throw
      if (!isRetryableError(e.message) || i === attempts.length - 1) throw e;
      // Notify UI and try next
      if (onFallback && attempts[i + 1]) {
        onFallback(attempts[i], attempts[i + 1], e.message);
      }
    }
  }
}

/**
 * Non-streaming chat with auto-retry fallback.
 */
export async function nonStreamChatWithRetry(apiKey, model, messages, signal, fallbackModels = [], onFallback) {
  const attempts = [model, ...fallbackModels.slice(0, 2)];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = await nonStreamChat(apiKey, attempts[i], messages, signal);
      return { ...result, actualModel: attempts[i] };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (!isRetryableError(e.message) || i === attempts.length - 1) throw e;
      if (onFallback && attempts[i + 1]) {
        onFallback(attempts[i], attempts[i + 1], e.message);
      }
    }
  }
}
