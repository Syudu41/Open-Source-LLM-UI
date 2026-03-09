import { useState, useRef, useEffect } from 'react';
import { Send, Square, Download, Trash2, Zap } from 'lucide-react';
import MessageBubble from './MessageBubble';
import Logo from './Logo';
import DataPolicyError from './DataPolicyError';
import { downloadJSON } from '../utils/export';

export default function Chat({ chatHook, selectedModel, promptLibrary, systemPrompt, autoRetry, fallbackModels, rateLimitRemaining }) {
  const { messages, isStreaming, send, stop, clear, retry } = chatHook;
  const [input, setInput] = useState('');
  const [dismissedPolicy, setDismissedPolicy] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const rateLimitHit = rateLimitRemaining != null && rateLimitRemaining <= 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || rateLimitHit) return;
    send(input, selectedModel, systemPrompt, { autoRetry, fallbackModels });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const usePrompt = (content) => {
    setInput(content);
    inputRef.current?.focus();
  };

  const hasDataPolicyError = !dismissedPolicy && messages.some((m) => m.errorType === 'DATA_POLICY');

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <Logo size={48} animate={true} className="text-ink-2 mb-4" />
            <h2 className="text-lg font-semibold mb-1">Pick a model from the sidebar and start chatting</h2>
            <p className="text-xs text-ink-3 mb-6">Ephemeral · No data stored · Free models only</p>

            {promptLibrary?.prompts?.length > 0 && (
              <div className="w-full">
                <p className="text-xs text-ink-3 mb-2">From your prompt library:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {promptLibrary.prompts.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => usePrompt(p.content)}
                      className="px-4 py-2 text-xs text-ink-2 rounded-lg border border-surface-3 hover:bg-surface-1 hover:text-ink-0 transition-colors"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">
            {hasDataPolicyError && (
              <DataPolicyError onDismiss={() => setDismissedPolicy(true)} />
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.fallbackFrom && msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 text-2xs text-ink-3 mb-1 px-1">
                    <Zap className="w-3 h-3" />
                    <span>
                      {msg.fallbackFrom.split('/').pop()} was unavailable — switched to {(msg.model || '').split('/').pop()}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} onRetry={msg.error && msg.retryContent ? () => retry(msg) : undefined} />
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3 items-center">
                <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                  <Logo size={20} animate={true} className="text-ink-3" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-2 px-4 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                rows={1}
                className="input-base pr-10 resize-none min-h-[48px] md:min-h-[40px] max-h-32"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            {isStreaming ? (
              <button onClick={stop} className="btn-primary p-3 md:p-2.5" title="Stop">
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel || rateLimitHit}
                className="btn-primary p-3 md:p-2.5 disabled:opacity-30"
                title={rateLimitHit ? 'Daily limit reached' : 'Send'}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {messages.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => downloadJSON({ messages, model: selectedModel, exportedAt: new Date().toISOString() }, `os-llm-ui-chat-${Date.now()}.json`)}
                className="text-2xs text-ink-3 hover:text-ink-2 flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button onClick={clear} className="text-2xs text-ink-3 hover:text-red-400 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
