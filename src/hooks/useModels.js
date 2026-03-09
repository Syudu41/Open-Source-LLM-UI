import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchModels, filterFreeModels, checkModelEndpoints } from '../utils/api';

const BATCH_SIZE = 5;
const BATCH_DELAY = 200; // ms between batches

export function useModels(apiKey) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const healthCacheRef = useRef({}); // session cache: modelId -> health

  const runHealthChecks = useCallback(async (modelList, key) => {
    // Mark unchecked models as 'checking'
    const toCheck = modelList.filter((m) => !healthCacheRef.current[m.id]);
    if (toCheck.length === 0) {
      // All already cached — apply cached values
      setModels((prev) =>
        prev.map((m) => ({ ...m, health: healthCacheRef.current[m.id] || 'unknown' }))
      );
      return;
    }

    // Mark new ones as 'checking'
    setModels((prev) =>
      prev.map((m) => ({
        ...m,
        health: healthCacheRef.current[m.id] || (toCheck.some((c) => c.id === m.id) ? 'checking' : 'unknown'),
      }))
    );

    for (let i = 0; i < toCheck.length; i += BATCH_SIZE) {
      const batch = toCheck.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (m) => {
          const health = await checkModelEndpoints(key, m.id);
          return { id: m.id, health };
        })
      );

      // Update cache and state
      for (const r of results) {
        healthCacheRef.current[r.id] = r.health;
      }
      setModels((prev) =>
        prev.map((m) => {
          const found = results.find((r) => r.id === m.id);
          return found ? { ...m, health: found.health } : m;
        })
      );

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < toCheck.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY));
      }
    }
  }, []);

  const load = useCallback(async (forceHealthRefresh = false) => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fetchModels(apiKey);
      const free = filterFreeModels(all);

      // Apply cached health or 'unknown'
      const withHealth = free.map((m) => ({
        ...m,
        health: healthCacheRef.current[m.id] || 'unknown',
      }));
      setModels(withHealth);

      // Clear cache if forcing refresh
      if (forceHealthRefresh) {
        healthCacheRef.current = {};
      }

      // Kick off background health checks (non-blocking)
      runHealthChecks(free, apiKey);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, runHealthChecks]);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { models, loading, error, refresh };
}
