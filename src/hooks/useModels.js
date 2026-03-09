import { useState, useEffect, useCallback } from 'react';
import { fetchModels, filterFreeModels } from '../utils/api';

export function useModels(apiKey) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fetchModels(apiKey);
      const free = filterFreeModels(all);
      setModels(free);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { models, loading, error, refresh: load };
}
