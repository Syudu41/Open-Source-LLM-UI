import { useState, useRef, useCallback } from 'react';
import { streamChat, classifyError } from '../utils/api';

export function useChat(apiKey) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const send = useCallback(
    async (userContent, model, systemPrompt) => {
      if (!apiKey || !model || !userContent.trim()) return;

      const userMsg = { role: 'user', content: userContent.trim() };
      setMessages((prev) => [...prev, userMsg]);

      const apiMessages = [];
      if (systemPrompt?.trim()) {
        apiMessages.push({ role: 'system', content: systemPrompt.trim() });
      }

      // Include conversation history
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push(...history);

      setIsStreaming(true);
      const assistantMsg = { role: 'assistant', content: '', model };
      setMessages((prev) => [...prev, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let fullContent = '';
        for await (const chunk of streamChat(apiKey, model, apiMessages, controller.signal)) {
          fullContent += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
            return updated;
          });
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          const errorType = classifyError(e.message);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: e.message,
              error: true,
              errorType,
              retryContent: userContent.trim(),
              retryModel: model,
              retrySystemPrompt: systemPrompt,
            };
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [apiKey, messages]
  );

  const retry = useCallback(
    (msg) => {
      if (!msg.retryContent || !msg.retryModel) return;
      // Remove the failed assistant message before resending
      setMessages((prev) => prev.filter((m) => m !== msg));
      // Re-send with the same content (need small delay so state settles)
      setTimeout(() => {
        send(msg.retryContent, msg.retryModel, msg.retrySystemPrompt);
      }, 0);
    },
    [send]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, send, stop, clear, retry };
}
