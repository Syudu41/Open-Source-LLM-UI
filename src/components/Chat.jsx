import { useState, useRef, useEffect } from 'react';
import { Send, Square, Download, Trash2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { downloadJSON } from '../utils/export';

export default function Chat({ chatHook, selectedModel, promptLibrary }) {
  const { messages, isStreaming, send, stop, clear } = chatHook;
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    send(input, selectedModel, systemPrompt);
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-surface-2 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-xl font-semibold text-ink-2">L</span>
            </div>
            <h2 className="text-lg font-semibold mb-1">Start a conversation</h2>
            <p className="text-sm text-ink-2 mb-6">
              Select a model above and start chatting. All responses are ephemeral.
            </p>

            {promptLibrary?.prompts?.length > 0 && (
              <div className="w-full">
                <p className="text-xs text-ink-3 mb-2">From your prompt library:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {promptLibrary.prompts.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => usePrompt(p.content)}
                      className="btn-ghost text-xs"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 bg-ink-3 rounded-full animate-pulse-dot" />
                    <span className="w-1 h-1 bg-ink-3 rounded-full animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 h-1 bg-ink-3 rounded-full animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-surface-2 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {showSystem && (
            <div className="mb-2">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="System prompt (optional)..."
                className="input-base text-xs resize-none h-16"
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                rows={1}
                className="input-base pr-10 resize-none min-h-[40px] max-h-32"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            {isStreaming ? (
              <button onClick={stop} className="btn-primary p-2.5" title="Stop">
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedModel}
                className="btn-primary p-2.5 disabled:opacity-30"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setShowSystem(!showSystem)} className="text-2xs text-ink-3 hover:text-ink-2">
              {showSystem ? 'Hide' : 'System prompt'}
            </button>
            {messages.length > 0 && (
              <>
                <button
                  onClick={() => downloadJSON({ messages, model: selectedModel, exportedAt: new Date().toISOString() }, `labllm-chat-${Date.now()}.json`)}
                  className="text-2xs text-ink-3 hover:text-ink-2 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
                <button onClick={clear} className="text-2xs text-ink-3 hover:text-red-400 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
