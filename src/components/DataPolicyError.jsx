import { X, ExternalLink } from 'lucide-react';

export default function DataPolicyError({ onDismiss }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">Privacy settings need updating</h3>
          <p className="text-xs text-ink-2 mb-3">
            Free models require you to allow data usage in your OpenRouter account. This is a one-time setup.
          </p>
          <ol className="text-xs text-ink-2 space-y-1 mb-3 list-decimal list-inside">
            <li>Go to OpenRouter Privacy Settings</li>
            <li>Enable &quot;Model Training&quot; and &quot;Prompt Logging&quot; for API</li>
            <li>Enable &quot;Free model publication&quot;</li>
            <li>Make sure &quot;Zero Data Retention only&quot; is OFF</li>
          </ol>
          <a
            href="https://openrouter.ai/settings/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-0 hover:text-ink-1 underline underline-offset-2"
          >
            Open Privacy Settings <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-surface-2 rounded-lg shrink-0"
          >
            <X className="w-3.5 h-3.5 text-ink-3" />
          </button>
        )}
      </div>
    </div>
  );
}
