import { useState, useRef } from 'react';
import {
  Plus, Search, Tag, Clock, GitBranch, Edit3, Trash2,
  Download, Upload, Copy, X, ChevronDown, ChevronRight,
} from 'lucide-react';
import { downloadJSON, importJSON } from '../utils/export';

export default function PromptLibrary({ library, onUsePrompt }) {
  const { prompts, addPrompt, updatePrompt, deletePrompt, forkPrompt, importPrompts } = library;
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showVersions, setShowVersions] = useState(null);
  const fileInputRef = useRef(null);

  // Create / Edit form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formNote, setFormNote] = useState('');

  const allTags = [...new Set(prompts.flatMap((p) => p.tags))].sort();

  const filtered = prompts.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !tagFilter || p.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const openCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormAuthor('');
    setFormNote('');
  };

  const openEdit = (p) => {
    setShowCreate(true);
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormContent(p.content);
    setFormTags(p.tags.join(', '));
    setFormAuthor(p.author);
    setFormNote('');
  };

  const handleSave = () => {
    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingId) {
      updatePrompt(editingId, {
        title: formTitle,
        content: formContent,
        tags,
        note: formNote || `Updated ${new Date().toLocaleDateString()}`,
      });
    } else {
      addPrompt({
        title: formTitle,
        content: formContent,
        tags,
        author: formAuthor || 'Anonymous',
      });
    }
    setShowCreate(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importJSON(file);
      importPrompts(Array.isArray(data) ? data : [data]);
    } catch {
      alert('Invalid file');
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Prompt Library</h2>
              <p className="text-xs text-ink-2">{prompts.length} prompts · local storage</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadJSON(prompts, `os-llm-ui-prompts-${Date.now()}.json`)}
                className="btn-ghost text-xs flex items-center gap-1"
                disabled={prompts.length === 0}
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Import
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <button onClick={openCreate} className="btn-primary text-xs flex items-center gap-1">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts..."
                className="input-base text-xs pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="input-base text-xs w-auto"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {/* Create / Edit form */}
          {showCreate && (
            <div className="card mb-4 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{editingId ? 'Edit prompt' : 'New prompt'}</h3>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-2 rounded">
                  <X className="w-3.5 h-3.5 text-ink-3" />
                </button>
              </div>

              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Title"
                className="input-base text-sm mb-2"
              />
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Prompt content..."
                className="input-base text-sm resize-none h-32 mb-2 font-mono"
              />
              <div className="flex gap-2 mb-2">
                <input
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="input-base text-xs flex-1"
                />
                {!editingId && (
                  <input
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="Author"
                    className="input-base text-xs w-32"
                  />
                )}
              </div>
              {editingId && (
                <input
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Version note (e.g., 'Added examples')"
                  className="input-base text-xs mb-2"
                />
              )}
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || !formContent.trim()}
                className="btn-primary text-xs disabled:opacity-30"
              >
                {editingId ? 'Save new version' : 'Create prompt'}
              </button>
            </div>
          )}

          {/* Prompt list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-ink-3">
                {prompts.length === 0 ? 'No prompts yet. Create your first one.' : 'No matching prompts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="card">
                  {/* Header row */}
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {expandedId === p.id ? (
                          <ChevronDown className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                        )}
                        <h4 className="text-sm font-medium truncate">{p.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-5.5">
                        <span className="text-2xs text-ink-3">{p.author}</span>
                        <span className="text-2xs text-ink-3">·</span>
                        <span className="text-2xs text-ink-3">v{p.versions?.length || 1}</span>
                        {p.tags?.map((t) => (
                          <span key={t} className="text-2xs bg-surface-2 px-1.5 py-0.5 rounded text-ink-2">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedId === p.id && (
                    <div className="mt-3 pt-3 border-t border-surface-2 animate-fade-in">
                      <pre className="text-xs text-ink-1 bg-surface-1 p-3 rounded-lg whitespace-pre-wrap mb-3 font-mono">
                        {p.content}
                      </pre>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mb-3">
                        {onUsePrompt && (
                          <button onClick={() => onUsePrompt(p.content)} className="btn-primary text-xs">
                            Use in chat
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} className="btn-ghost text-xs flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => forkPrompt(p.id)}
                          className="btn-ghost text-xs flex items-center gap-1"
                        >
                          <GitBranch className="w-3 h-3" /> Fork
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(p.content);
                          }}
                          className="btn-ghost text-xs flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this prompt?')) deletePrompt(p.id);
                          }}
                          className="btn-ghost text-xs text-red-400 hover:text-red-500 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>

                      {/* Version history */}
                      {p.versions?.length > 1 && (
                        <div>
                          <button
                            onClick={() => setShowVersions(showVersions === p.id ? null : p.id)}
                            className="text-2xs text-ink-3 hover:text-ink-2 flex items-center gap-1 mb-2"
                          >
                            <Clock className="w-3 h-3" />
                            {p.versions.length} versions
                            {showVersions === p.id ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>

                          {showVersions === p.id && (
                            <div className="space-y-1 ml-4 animate-fade-in">
                              {[...p.versions].reverse().map((v, i) => (
                                <div key={i} className="flex items-start gap-2 text-2xs">
                                  <span className="text-ink-3 shrink-0 w-10">
                                    v{p.versions.length - i}
                                  </span>
                                  <span className="text-ink-2 truncate flex-1">{v.note || 'No note'}</span>
                                  <span className="text-ink-3 shrink-0">
                                    {new Date(v.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
