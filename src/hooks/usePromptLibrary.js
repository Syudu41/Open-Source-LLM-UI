import { useState, useCallback, useEffect } from 'react';
import { getPrompts, savePrompts, generateId } from '../utils/storage';

/**
 * Prompt shape:
 * {
 *   id: string,
 *   title: string,
 *   content: string,
 *   tags: string[],
 *   author: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   versions: [{ content: string, timestamp: string, note: string }],
 *   currentVersion: number,
 * }
 */

export function usePromptLibrary() {
  const [prompts, setPrompts] = useState(() => getPrompts());

  useEffect(() => {
    savePrompts(prompts);
  }, [prompts]);

  const addPrompt = useCallback(({ title, content, tags = [], author = 'Anonymous' }) => {
    const now = new Date().toISOString();
    const prompt = {
      id: generateId(),
      title,
      content,
      tags,
      author,
      createdAt: now,
      updatedAt: now,
      versions: [{ content, timestamp: now, note: 'Initial version' }],
      currentVersion: 0,
    };
    setPrompts((prev) => [prompt, ...prev]);
    return prompt;
  }, []);

  const updatePrompt = useCallback((id, { title, content, tags, note = '' }) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const now = new Date().toISOString();
        const newVersions = [...p.versions, { content, timestamp: now, note }];
        return {
          ...p,
          title: title ?? p.title,
          content,
          tags: tags ?? p.tags,
          updatedAt: now,
          versions: newVersions,
          currentVersion: newVersions.length - 1,
        };
      })
    );
  }, []);

  const deletePrompt = useCallback((id) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const forkPrompt = useCallback(
    (id, author = 'Anonymous') => {
      const original = prompts.find((p) => p.id === id);
      if (!original) return;
      const now = new Date().toISOString();
      const forked = {
        id: generateId(),
        title: `${original.title} (fork)`,
        content: original.content,
        tags: [...original.tags],
        author,
        createdAt: now,
        updatedAt: now,
        versions: [{ content: original.content, timestamp: now, note: `Forked from "${original.title}"` }],
        currentVersion: 0,
      };
      setPrompts((prev) => [forked, ...prev]);
      return forked;
    },
    [prompts]
  );

  const importPrompts = useCallback((imported) => {
    if (!Array.isArray(imported)) return;
    setPrompts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newPrompts = imported.filter((p) => !existingIds.has(p.id));
      return [...newPrompts, ...prev];
    });
  }, []);

  return { prompts, addPrompt, updatePrompt, deletePrompt, forkPrompt, importPrompts };
}
