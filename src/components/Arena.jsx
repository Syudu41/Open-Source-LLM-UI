import { useState, useRef } from 'react';
import { Shuffle, Send, Eye, Trophy, RotateCcw, Download } from 'lucide-react';
import { streamChat } from '../utils/api';
import { downloadJSON } from '../utils/export';
import ReactMarkdown from 'react-markdown';

export default function Arena({ apiKey, models }) {
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  const [prompt, setPrompt] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [vote, setVote] = useState(null); // 'A', 'B', 'tie'
  const [history, setHistory] = useState([]);
  const abortRef = useRef(null);

  const randomize = () => {
    if (models.length < 2) return;
    const shuffled = [...models].sort(() => Math.random() - 0.5);
    setModelA(shuffled[0].id);
    setModelB(shuffled[1].id);
  };

  const run = async () => {
    if (!prompt.trim() || !modelA || !modelB) return;
    setLoading(true);
    setRevealed(false);
    setVote(null);
    setResponseA('');
    setResponseB('');

    const controller = new AbortController();
    abortRef.current = controller;
    const messages = [{ role: 'user', content: prompt.trim() }];

    const streamTo = async (model, setter) => {
      try {
        let full = '';
        for await (const chunk of streamChat(apiKey, model, messages, controller.signal)) {
          full += chunk;
          setter(full);
        }
      } catch (e) {
        if (e.name !== 'AbortError') setter(`Error: ${e.message}`);
      }
    };

    await Promise.all([streamTo(modelA, setResponseA), streamTo(modelB, setResponseB)]);
    setLoading(false);
  };

  const handleVote = (v) => {
    setVote(v);
    setRevealed(true);
    setHistory((prev) => [
      ...prev,
      { prompt, modelA, modelB, vote: v, timestamp: new Date().toISOString() },
    ]);
  };

  const reset = () => {
    abortRef.current?.abort();
    setPrompt('');
    setResponseA('');
    setResponseB('');
    setRevealed(false);
    setVote(null);
    setLoading(false);
  };

  const getModelLabel = (id) => (id || '').split('/').pop() || 'Unknown';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Arena</h2>
              <p className="text-xs text-ink-2">Blind side-by-side model comparison</p>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => downloadJSON(history, `labllm-arena-${Date.now()}.json`)}
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Export ({history.length})
              </button>
            )}
          </div>

          {/* Model selection */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              className="input-base text-xs flex-1"
            >
              <option value="">Model A</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{getModelLabel(m.id)}</option>
              ))}
            </select>

            <span className="text-xs text-ink-3 font-medium">vs</span>

            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              className="input-base text-xs flex-1"
            >
              <option value="">Model B</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{getModelLabel(m.id)}</option>
              ))}
            </select>

            <button onClick={randomize} className="btn-secondary p-2" title="Randomize">
              <Shuffle className="w-4 h-4" />
            </button>
          </div>

          {/* Prompt input */}
          <div className="flex gap-2 mb-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
              className="input-base text-sm resize-none h-20 flex-1"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={run}
                disabled={loading || !prompt.trim() || !modelA || !modelB}
                className="btn-primary p-2.5 disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
              <button onClick={reset} className="btn-secondary p-2.5">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Responses */}
          {(responseA || responseB || loading) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['A', 'B'].map((side) => {
                const response = side === 'A' ? responseA : responseB;
                const modelId = side === 'A' ? modelA : modelB;
                return (
                  <div key={side} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-ink-2">
                        {revealed ? getModelLabel(modelId) : `Model ${side}`}
                      </span>
                      {revealed && vote === side && (
                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                      )}
                    </div>
                    <div className="text-sm leading-relaxed markdown-content min-h-[60px]">
                      {response ? (
                        <ReactMarkdown>{response}</ReactMarkdown>
                      ) : loading ? (
                        <div className="flex gap-1 items-center text-ink-3">
                          <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-pulse-dot" />
                          <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
                          <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Voting */}
          {responseA && responseB && !loading && !vote && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => handleVote('A')} className="btn-secondary text-sm">
                Model A wins
              </button>
              <button onClick={() => handleVote('tie')} className="btn-ghost text-sm">
                Tie
              </button>
              <button onClick={() => handleVote('B')} className="btn-secondary text-sm">
                Model B wins
              </button>
            </div>
          )}

          {vote && (
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-1 rounded-full text-sm">
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {vote === 'tie'
                    ? "It's a tie!"
                    : `${getModelLabel(vote === 'A' ? modelA : modelB)} wins`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
