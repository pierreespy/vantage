/**
 * Glossary provider — the growing lexicon of every past "mot du jour".
 *
 * Fetches config.wordsUrl (words.json), same resolution order as EditionProvider so
 * a screen always has something to show:
 *   1. live   — freshly fetched (also cached)
 *   2. cache  — last successfully fetched glossary (works offline)
 *   3. seed   — the bundled sample word, so a fresh install isn't empty
 *
 * The list is newest-first. Today's term is merged in by the Glossaire screen from
 * the live edition, so it appears immediately even before the generation task has
 * appended it to words.json.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config';
import { sampleEdition } from './sampleEdition';
import { parseGlossary, type GlossaryWord } from './types';

const CACHE_KEY = 'vantage.glossary.v1';

/** Bundled seed so the glossary is never empty on a cold, offline first launch. */
const SEED: GlossaryWord[] = [
  { ...sampleEdition.word, date: '2026-07-08', dateLong: sampleEdition.dateLong },
];

type GlossaryContextValue = {
  words: GlossaryWord[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const GlossaryContext = createContext<GlossaryContextValue | null>(null);

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<GlossaryWord[]>(SEED);
  const [loading, setLoading] = useState(false);

  // Warm up from cache immediately (offline-friendly).
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = parseGlossary(JSON.parse(raw));
        if (parsed && parsed.length) setWords(parsed);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(config.wordsUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseGlossary(await res.json());
      if (!parsed) throw new Error('Malformed glossary');
      setWords(parsed);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ words: parsed })).catch(() => {});
    } catch {
      // Keep whatever we already have (cache or seed) — never blank the screen.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<GlossaryContextValue>(
    () => ({ words, loading, refresh }),
    [words, loading, refresh]
  );

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary(): GlossaryContextValue {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossary must be used within a GlossaryProvider');
  return ctx;
}
