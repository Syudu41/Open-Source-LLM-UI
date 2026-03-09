import { useState } from 'react';
import { KeyRound, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { validateApiKey } from '../utils/api';
import Logo from './Logo';

export default function ApiKeyModal({ onSubmit }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError('');

    const valid = await validateApiKey(key.trim());
    if (valid) {
      onSubmit(key.trim());
    } else {
      setError('Invalid API key. Please check and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center gap-2.5 mb-8">
          <Logo size={36} animate={true} className="text-ink-0" />
          <span className="text-lg font-semibold tracking-tight">CfIA Lab Open Source LLM UI</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">Get started</h1>
        <p className="text-ink-2 text-sm mb-6">
          Enter your OpenRouter API key to access free open-source models.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-3">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="input-base pl-10"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-2xs text-ink-3 mt-4 text-center">
          Key stored in session only — never persisted.{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-0.5 hover:text-ink-2"
          >
            Get a key <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
