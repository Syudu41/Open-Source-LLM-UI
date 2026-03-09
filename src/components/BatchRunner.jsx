import { useState, useRef } from 'react';
import { Play, Square, Download, CheckSquare, XSquare, Clock, Hash } from 'lucide-react';
import { nonStreamChat } from '../utils/api';
import { downloadCSV, downloadJSON } from '../utils/export';
import ReactMarkdown from 'react-markdown';

export default function BatchRunner({ apiKey, models }) {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState(new Set());
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef(null);

  const toggleModel = (id) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedModels.size === models.length) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(models.map((m) => m.id)));
    }
  };

  const run = async () => {
    if (!prompt.trim() || selectedModels.size === 0) return;

    setRunning(true);
    setResults([]);
    const controller = new AbortController();
    abortRef.current = controller;

    const modelList = [...selectedModels];
    setProgress({ done: 0, total: modelList.length });

    const concurrency = 3;
    const queue = [...modelList];
    const resultsList = [];

    const worker = async () => {
      while (queue.length > 0) {
        if (controller.signal.aborted) return;
        const modelId = queue.shift();
        if (!modelId) return;

        try {
          const result = await nonStreamChat(
            apiKey,
            modelId,
            [{ role: 'user', content: prompt.trim() }],
            controller.signal
          );

          const entry = {
            model: modelId,
            modelName: modelId.split('/').pop(),
            content: result.content,
            latency: result.latency,
            tokens: result.tokens,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            error: null,
          };
          resultsList.push(entry);
          setResults((prev) => [...prev, entry]);
        } catch (e) {
          if (e.name === 'AbortError') return;
          const entry = {
            model: modelId,
            modelName: modelId.split('/').pop(),
            content: '',
            latency: 0,
            tokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            error: e.message,
          };
          resultsList.push(entry);
          setResults((prev) => [...prev, entry]);
        }

        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, modelList.length) }, () => worker());
    await Promise.all(workers);

    setRunning(false);
  };

  const stopRun = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const [expandedResult, setExpandedResult] = useState(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Batch Runner</h2>
            <p className="text-xs text-ink-2">Test one prompt across multiple models simultaneously</p>
          </div>

          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter the prompt to test across all selected models..."
            className="input-base text-sm resize-none h-24 mb-4"
          />

          {/* Model selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink-2">
                Models ({selectedModels.size}/{models.length})
              </span>
              <button onClick={selectAll} className="text-2xs text-ink-3 hover:text-ink-2">
                {selectedModels.size === models.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-surface-1 rounded-lg">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-colors ${
                    selectedModels.has(m.id)
                      ? 'bg-ink-0 text-white'
                      : 'bg-white text-ink-2 hover:bg-surface-2 border border-surface-3'
                  }`}
                >
                  {m.id.split('/').pop()}
                </button>
              ))}
            </div>
          </div>

          {/* Run controls */}
          <div className="flex items-center gap-3 mb-6">
            {running ? (
              <button onClick={stopRun} className="btn-primary flex items-center gap-2">
                <Square className="w-4 h-4" /> Stop
              </button>
            ) : (
              <button
                onClick={run}
                disabled={!prompt.trim() || selectedModels.size === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-30"
              >
                <Play className="w-4 h-4" /> Run batch
              </button>
            )}

            {(running || results.length > 0) && (
              <span className="text-xs text-ink-3">
                {progress.done}/{progress.total} complete
              </span>
            )}

            {results.length > 0 && !running && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() =>
                    downloadCSV(
                      results.map((r) => ({
                        model: r.model,
                        latency_ms: r.latency,
                        tokens: r.tokens,
                        response: r.content.slice(0, 500),
                        error: r.error || '',
                      })),
                      `labllm-batch-${Date.now()}.csv`
                    )
                  }
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={() =>
                    downloadJSON(
                      { prompt, results, timestamp: new Date().toISOString() },
                      `labllm-batch-${Date.now()}.json`
                    )
                  }
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> JSON
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results
                .sort((a, b) => a.latency - b.latency)
                .map((r, i) => (
                  <div key={r.model} className="card">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-5 text-ink-3">#{i + 1}</span>
                        <span className="text-sm font-medium">{r.modelName}</span>
                        {r.error && (
                          <span className="text-2xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">Error</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-2xs text-ink-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {(r.latency / 1000).toFixed(1)}s
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {r.tokens} tok
                        </span>
                      </div>
                    </div>

                    {expandedResult === i && (
                      <div className="mt-3 pt-3 border-t border-surface-2 text-sm markdown-content animate-fade-in">
                        {r.error ? (
                          <p className="text-red-500 text-xs">{r.error}</p>
                        ) : (
                          <ReactMarkdown>{r.content}</ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
