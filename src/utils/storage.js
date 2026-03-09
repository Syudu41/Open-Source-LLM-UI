const API_KEY_STORAGE = 'os_llm_ui_api_key';
const PROMPTS_STORAGE = 'os_llm_ui_prompts';

export function getApiKey() {
  return sessionStorage.getItem(API_KEY_STORAGE) || '';
}

export function setApiKey(key) {
  sessionStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey() {
  sessionStorage.removeItem(API_KEY_STORAGE);
}

// Prompt Library (persisted in localStorage for cross-session use)
export function getPrompts() {
  try {
    const raw = localStorage.getItem(PROMPTS_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePrompts(prompts) {
  localStorage.setItem(PROMPTS_STORAGE, JSON.stringify(prompts));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
