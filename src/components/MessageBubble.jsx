import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import { Copy, Check, User, Bot } from 'lucide-react';
import { useState } from 'react';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);

const codeTheme = {
  'code[class*="language-"]': { color: '#374151', fontFamily: "'SF Mono', Menlo, monospace", fontSize: '0.8125rem', lineHeight: '1.5' },
  'pre[class*="language-"]': { background: '#f3f4f6', padding: '1em', borderRadius: '8px', overflow: 'auto' },
  comment: { color: '#9ca3af' },
  keyword: { color: '#7c3aed' },
  string: { color: '#059669' },
  function: { color: '#2563eb' },
  number: { color: '#d97706' },
  operator: { color: '#374151' },
  punctuation: { color: '#6b7280' },
  'class-name': { color: '#dc2626' },
  builtin: { color: '#2563eb' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1 rounded bg-white/80 hover:bg-white border border-surface-3 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-ink-3" />}
    </button>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-ink-2" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-ink-0 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
            {message.content}
          </div>
        ) : (
          <div className={`text-sm leading-relaxed ${message.error ? 'text-red-500' : 'text-ink-0'}`}>
            {message.model && (
              <span className="text-2xs text-ink-3 font-medium mb-1 block">
                {message.model.split('/').pop()}
              </span>
            )}
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeStr = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      return (
                        <div className="relative group">
                          <CopyButton text={codeStr} />
                          <SyntaxHighlighter
                            style={codeTheme}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-ink-0 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
