import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  MessageSquare, Swords, FlaskConical, BookOpen,
  LogOut, Menu, X, ChevronDown, ChevronRight, RefreshCw,
  Search, Check, Cpu, Zap,
} from 'lucide-react';
import Logo from './components/Logo';
import ApiKeyModal from './components/ApiKeyModal';
import Chat from './components/Chat';
import Arena from './components/Arena';
import BatchRunner from './components/BatchRunner';
import PromptLibrary from './components/PromptLibrary';
import { useModels } from './hooks/useModels';
import { useChat } from './hooks/useChat';
import { usePromptLibrary } from './hooks/usePromptLibrary';
import { getApiKey, setApiKey, clearApiKey } from './utils/storage';
import { getRateLimitStatus } from './utils/api';

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
  const [systemPrompt, setSystemPrompt] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelSectionOpen, setModelSectionOpen] = useState(true);
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [autoRetry, setAutoRetry] = useState(true);
  const [rateLimit, setRateLimit] = useState({ limit: null, remaining: null, resetTime: null });

  const { models, loading: modelsLoading, refresh: refreshModels } = useModels(apiKeyState);
  const chatHook = useChat(apiKeyState);
  const promptLibrary = usePromptLibrary();

  // Poll rate limit status after each render cycle (cheap — reads local var)
  useEffect(() => {
    const id = setInterval(() => setRateLimit(getRateLimitStatus()), 2000);
    return () => clearInterval(id);
  }, []);

  // Compute fallback models: top 3 available models that are not the currently selected
  const fallbackModels = useMemo(() => {
    return models
      .filter((m) => m.health === 'available' && m.id !== selectedModel)
      .slice(0, 3)
      .map((m) => m.id);
  }, [models, selectedModel]);

  const handleApiKey = useCallback((key) => {
    setApiKey(key);
    setApiKeyState(key);
  }, []);

  const handleLogout = useCallback(() => {
    clearApiKey();
    setApiKeyState('');
  }, []);

  const handleTabChange = useCallback((id) => {
    setTab(id);
    setSidebarOpen(false);
  }, []);

  const handleUsePrompt = useCallback((content) => {
    setTab('chat');
    setSidebarOpen(false);
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

  // Auto-select first available model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const available = models.find((m) => m.health === 'available');
      setSelectedModel(available ? available.id : models[0].id);
    }
  }, [models, selectedModel]);

  if (!apiKeyState) {
    return <ApiKeyModal onSubmit={handleApiKey} />;
  }

  const filteredModels = models
    .filter(
      (m) =>
        (m.name || m.id).toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.id.toLowerCase().includes(modelSearch.toLowerCase())
    )
    .sort((a, b) => {
      // Sort: available first, then checking/unknown, then unavailable last
      const order = { available: 0, checking: 1, unknown: 1, unavailable: 2 };
      const diff = (order[a.health] ?? 1) - (order[b.health] ?? 1);
      if (diff !== 0) return diff;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });

  const selectedModelObj = models.find((m) => m.id === selectedModel);
  const selectedModelName = selectedModelObj
    ? (selectedModelObj.name || selectedModelObj.id).split('/').pop()
    : 'Select model';

  return (
    <div className="h-screen flex bg-white">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-[260px] bg-surface-1 border-r border-surface-3 flex flex-col shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size={28} className="text-ink-0 shrink-0" />
            <div className="min-w-0">
              <div className="text-large font-bold tracking-tight truncate leading-tight">CfIA Lab</div>
              <div className="text-xs text-ink-2 truncate leading-tight">Open Source LLM UI</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-surface-2 rounded-lg md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>

        {/* Nav tabs */}
        <nav className="px-2 mb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 md:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
                tab === id
                  ? 'bg-surface-2 text-ink-0'
                  : 'text-ink-2 hover:text-ink-0 hover:bg-surface-2'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mx-3 border-t border-surface-3" />

        {/* Model Selector section */}
        <div className="px-3 py-3">
          <button
            onClick={() => setModelSectionOpen(!modelSectionOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> Model
            </span>
            {modelSectionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {!modelSectionOpen && (
            <div className="text-xs text-ink-1 truncate px-1">{selectedModelName}</div>
          )}

          {modelSectionOpen && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search models..."
                    className="input-base text-xs pl-7 py-1.5"
                  />
                </div>
                <button
                  onClick={refreshModels}
                  disabled={modelsLoading}
                  className="p-1.5 hover:bg-surface-2 rounded-lg shrink-0"
                  title="Refresh models"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-ink-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="max-h-48 md:max-h-48 overflow-y-auto -mx-1 scrollbar-thin">
                {filteredModels.length === 0 ? (
                  <p className="text-2xs text-ink-3 px-2 py-3 text-center">
                    {modelsLoading ? 'Loading models...' : 'No models found'}
                  </p>
                ) : (
                  filteredModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setModelSearch('');
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                        model.health === 'unavailable' ? 'opacity-40 ' : ''
                      }${
                        model.id === selectedModel ? 'bg-surface-2 text-ink-0' : 'hover:bg-surface-2 text-ink-1'
                      }`}
                    >
                      {/* Health dot */}
                      {model.health === 'available' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      )}
                      {model.health === 'unavailable' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      )}
                      {model.health === 'checking' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {(model.name || model.id).split('/').pop()}
                        </div>
                        <div className="text-2xs text-ink-3 truncate">
                          {(model.context_length || 0).toLocaleString()} ctx
                          {model.health === 'unavailable' && ' · May be unavailable'}
                        </div>
                      </div>
                      {model.id === selectedModel && <Check className="w-3.5 h-3.5 text-ink-0 shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              <div className="mt-1.5 text-2xs text-ink-3 px-1">{models.length} free models</div>
            </div>
          )}
        </div>

        <div className="mx-3 border-t border-surface-3" />

        {/* System Prompt section */}
        <div className="px-3 py-3">
          <button
            onClick={() => setSystemPromptOpen(!systemPromptOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1"
          >
            <span className="flex items-center gap-1.5">
              System Prompt
              {systemPrompt.trim() && (
                <span className="w-1.5 h-1.5 rounded-full bg-ink-0 inline-block" />
              )}
            </span>
            {systemPromptOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {!systemPromptOpen && systemPrompt.trim() && (
            <div className="text-2xs text-ink-3 truncate px-1">{systemPrompt.trim().slice(0, 60)}</div>
          )}

          {systemPromptOpen && (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="input-base text-xs resize-y mt-1 animate-fade-in"
              style={{ minHeight: '120px' }}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-3 flex items-center justify-between">
          <span className="text-2xs text-ink-3">{models.length} free models</span>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-ink-3" />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-14 border-b border-surface-2 flex items-center px-4 shrink-0 relative">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-surface-2 rounded-lg md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-ink-1" />
          </button>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold tracking-tight leading-tight">CfIA Lab</span>
            <span className="text-xs text-ink-2 leading-tight hidden sm:block">Open Source LLM UI</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors hidden md:flex"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 text-ink-3" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {tab === 'chat' && (
            <Chat
              chatHook={chatHook}
              selectedModel={selectedModel}
              promptLibrary={promptLibrary}
              systemPrompt={systemPrompt}
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
    </div>
  );
}
