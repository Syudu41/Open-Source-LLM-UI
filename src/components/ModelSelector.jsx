import { ChevronDown, RefreshCw, Cpu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ModelSelector({ models, selected, onSelect, loading, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = models.filter(
    (m) =>
      (m.name || m.id).toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedModel = models.find((m) => m.id === selected);
  const displayName = selectedModel ? (selectedModel.name || selectedModel.id).split('/').pop() : 'Select model';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors text-sm"
      >
        <Cpu className="w-3.5 h-3.5 text-ink-3" />
        <span className="font-medium truncate max-w-[200px]">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-surface-3 rounded-xl shadow-lg z-50 animate-fade-in overflow-hidden">
          <div className="p-2 border-b border-surface-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="input-base text-xs"
                autoFocus
              />
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 hover:bg-surface-2 rounded-lg transition-colors shrink-0"
                title="Refresh models"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-ink-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-ink-3 px-3 py-4 text-center">
                {loading ? 'Loading models...' : 'No models found'}
              </p>
            ) : (
              filtered.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-surface-1 transition-colors ${
                    model.id === selected ? 'bg-surface-1' : ''
                  }`}
                >
                  <div className="text-xs font-medium truncate">
                    {(model.name || model.id).split('/').pop()}
                  </div>
                  <div className="text-2xs text-ink-3 truncate mt-0.5">
                    {model.id} · {(model.context_length || 0).toLocaleString()} ctx
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-surface-2">
            <p className="text-2xs text-ink-3">{models.length} free models available</p>
          </div>
        </div>
      )}
    </div>
  );
}
