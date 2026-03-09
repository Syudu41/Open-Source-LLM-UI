import { useState, useCallback } from 'react';
import {
  MessageSquare, Swords, FlaskConical, BookOpen,
  LogOut, RefreshCw, Cpu,
} from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ModelSelector from './components/ModelSelector';
import Chat from './components/Chat';
import Arena from './components/Arena';
import BatchRunner from './components/BatchRunner';
import PromptLibrary from './components/PromptLibrary';
import { useModels } from './hooks/useModels';
import { useChat } from './hooks/useChat';
import { usePromptLibrary } from './hooks/usePromptLibrary';
import { getApiKey, setApiKey, clearApiKey } from './utils/storage';

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'arena', label: 'Arena', icon: Swords },
  { id: 'batch', label: 'Batch', icon: FlaskConical },
  { id: 'prompts', label: 'Prompts', icon: BookOpen },
];

export default function App() {
  const [apiKeyState, setApiKeyState] = useState(() => getApiKey());
  const [tab, setTab] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('');

  const { models, loading: modelsLoading, refresh: refreshModels } = useModels(apiKeyState);
  const chatHook = useChat(apiKeyState);
  const promptLibrary = usePromptLibrary();

  const handleApiKey = useCallback((key) => {
    setApiKey(key);
    setApiKeyState(key);
  }, []);

  const handleLogout = useCallback(() => {
    clearApiKey();
    setApiKeyState('');
  }, []);

  const handleUsePrompt = useCallback((content) => {
    setTab('chat');
    // Small delay to ensure tab switch renders first
    setTimeout(() => {
      const input = document.querySelector('textarea[placeholder="Message..."]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, content);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
    }, 50);
  }, []);

  // Auto-select first model when models load
  if (models.length > 0 && !selectedModel) {
    setSelectedModel(models[0].id);
  }

  if (!apiKeyState) {
    return <ApiKeyModal onSubmit={handleApiKey} />;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="h-12 border-b border-surface-2 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink-0 rounded-md flex items-center justify-center">
              <span className="text-white font-semibold text-xs">L</span>
            </div>
            <span className="text-sm font-semibold tracking-tight hidden sm:inline">LabLLM</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === id
                    ? 'bg-surface-2 text-ink-0'
                    : 'text-ink-2 hover:text-ink-0 hover:bg-surface-1'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'chat' && (
            <ModelSelector
              models={models}
              selected={selectedModel}
              onSelect={setSelectedModel}
              loading={modelsLoading}
              onRefresh={refreshModels}
            />
          )}

          <div className="flex items-center gap-1">
            <span className="text-2xs text-ink-3 hidden md:inline">
              {models.length} free models
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 text-ink-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'chat' && (
          <Chat
            chatHook={chatHook}
            selectedModel={selectedModel}
            promptLibrary={promptLibrary}
          />
        )}
        {tab === 'arena' && (
          <Arena apiKey={apiKeyState} models={models} />
        )}
        {tab === 'batch' && (
          <BatchRunner apiKey={apiKeyState} models={models} />
        )}
        {tab === 'prompts' && (
          <PromptLibrary library={promptLibrary} onUsePrompt={handleUsePrompt} />
        )}
      </main>
    </div>
  );
}
