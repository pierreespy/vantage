/**
 * Daily content provider.
 *
 * On launch (and on pull-to-refresh) it fetches the day's edition JSON from
 * config.contentUrl. Resolution order, so the app ALWAYS shows something:
 *   1. live   — freshly fetched from the URL (also cached for next time)
 *   2. cache  — last successfully fetched edition (works offline)
 *   3. sample — the edition bundled inside the app
 *
 * It also accumulates a company → funding-stage map from every edition seen, so a
 * followed startup keeps showing its round (Series A/B…) even after it leaves the
 * news — the "dynamic stage via the journal" model.
 *
 * In the same spirit it accumulates the startups the journal introduces that aren't in
 * the built-in catalog (`discoveredStartups`): whenever a company appears in an edition
 * without being known to the app, it's remembered here so it joins the searchable
 * directory in "Ajouter un favori" — never auto-followed, just made findable.
 *
 * It likewise accumulates which companies use AI (`usesAI`): the curated `aiStartups`
 * list plus every company an edition flags with `ai: true`, so the "IA" badge shows in
 * the Journal and on Favoris cards and sticks once flagged.
 *
 * Exposed app-wide so every screen reads the same edition.
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
import { catalog } from '@/data/favoris';
import { isAiStartup } from '@/data/aiStartups';
import { sampleEdition } from './sampleEdition';
import { editionAiCompanies, editionCompanies, editionStages, isEdition, type Edition } from './types';

const CACHE_KEY = 'vantage.edition.v1';
const STAGES_KEY = 'vantage.stages.v1';
const DISCOVERED_KEY = 'vantage.discoveredStartups.v2';
const AI_KEY = 'vantage.aiCompanies.v1';

/** Names the app already knows statically — a company in here is NOT a discovery. */
const KNOWN = new Set(catalog.map((s) => s.name.toLowerCase()));

/** A brève's `company` is the subject of the story — usually a startup, but sometimes an
 *  investor or a regulator (a fund's new vehicle, a regulatory ruling). We only want
 *  startups in the directory, so we drop the subjects whose sector marks them as not one.
 *  This is a best-effort filter on the structured sector; a non-startup mislabeled with a
 *  startup sector can still slip through. The lead and deal carry no sector and are always
 *  kept (they're the day's featured startup). */
const NON_STARTUP_SECTORS = new Set([
  'fonds',
  'fund',
  'réglementaire',
  'reglementaire',
  'réglementation',
  'reglementation',
  'régulateur',
  'regulateur',
]);

/** A startup the app knows about: name + sector + funding stage. `sector` may be '' and
 *  `stage` undefined when the journal didn't say. */
export type DirectoryStartup = { name: string; sector: string; stage?: string };

/** What we persist per discovered startup: its sector and funding stage as last seen. */
type Discovery = { sector: string; stage?: string };

export type EditionSource = 'sample' | 'cache' | 'live';

type EditionContextValue = {
  edition: Edition;
  /** Where the current edition came from. */
  source: EditionSource;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** Re-fetch the live edition (used by pull-to-refresh). */
  refresh: () => Promise<void>;
  /** Funding stage known for a company (from any edition seen), or undefined. */
  stageOf: (name: string) => string | undefined;
  /** Startups the journal introduced that aren't in the built-in catalog, accumulated
   *  across every edition seen — each with its sector and funding stage. They extend the
   *  searchable directory. */
  discoveredStartups: DirectoryStartup[];
  /** True when a company is AI-driven — from the curated list or any edition that flagged
   *  it. Drives the "IA" badge in the Journal and on Favoris cards. */
  usesAI: (name: string) => boolean;
};

const EditionContext = createContext<EditionContextValue | null>(null);

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEdition] = useState<Edition>(sampleEdition);
  const [source, setSource] = useState<EditionSource>('sample');
  const [loading, setLoading] = useState(false);

  const [stages, setStages] = useState<Record<string, string>>({});
  const [stagesHydrated, setStagesHydrated] = useState(false);

  // Startups discovered via the journal (name → {sector, stage}), accumulated across editions.
  const [discovered, setDiscovered] = useState<Record<string, Discovery>>({});
  const [discoveredHydrated, setDiscoveredHydrated] = useState(false);

  // Companies the journal has flagged as AI-using (lowercased name → true), accumulated.
  const [aiCompanies, setAiCompanies] = useState<Record<string, true>>({});
  const [aiHydrated, setAiHydrated] = useState(false);

  // Warm up edition from cache immediately, so a cold offline start shows the last edition.
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isEdition(parsed)) {
          setEdition(parsed);
          setSource((s) => (s === 'sample' ? 'cache' : s));
        }
      })
      .catch(() => {});
  }, []);

  // Load the accumulated stage map once.
  useEffect(() => {
    AsyncStorage.getItem(STAGES_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setStages(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setStagesHydrated(true));
  }, []);

  // Merge each edition's stages into the map (only after hydration, so we don't
  // clobber the persisted history with just the sample edition).
  useEffect(() => {
    if (!stagesHydrated) return;
    const next = editionStages(edition);
    if (Object.keys(next).length === 0) return;
    setStages((prev) => ({ ...prev, ...next }));
  }, [edition, stagesHydrated]);

  // Persist the stage map when it changes.
  useEffect(() => {
    if (!stagesHydrated) return;
    AsyncStorage.setItem(STAGES_KEY, JSON.stringify(stages)).catch(() => {});
  }, [stages, stagesHydrated]);

  // Load the accumulated discovered-startups map once. Normalize each entry to
  // { sector, stage } — tolerating a legacy bare-string sector — so a malformed store
  // can't poison the directory.
  useEffect(() => {
    AsyncStorage.getItem(DISCOVERED_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        const out: Record<string, Discovery> = {};
        for (const [name, v] of Object.entries(parsed)) {
          if (typeof v === 'string') out[name] = { sector: v };
          else if (v && typeof v === 'object') {
            const o = v as Record<string, unknown>;
            out[name] = {
              sector: typeof o.sector === 'string' ? o.sector : '',
              stage: typeof o.stage === 'string' ? o.stage : undefined,
            };
          }
        }
        setDiscovered(out);
      })
      .catch(() => {})
      .finally(() => setDiscoveredHydrated(true));
  }, []);

  // Fold each edition's companies into the discovered map: keep any name the journal
  // mentions that the built-in catalog doesn't already have, recording its sector AND
  // funding stage. A stored non-empty sector/stage is never overwritten by a later
  // edition that mentions the company without one (the two fields fill independently).
  useEffect(() => {
    if (!discoveredHydrated) return;
    const companies = editionCompanies(edition);
    if (companies.length === 0) return;
    setDiscovered((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { name, sector, stage } of companies) {
        if (KNOWN.has(name.toLowerCase())) continue; // already a catalog startup
        if (NON_STARTUP_SECTORS.has(sector.trim().toLowerCase())) continue; // fund/regulator, not a startup
        // Mirror the backend's 80-char cap so a discovered name stays reportable if followed.
        if (name.length > 80) continue;
        const existing = next[name];
        if (!existing) {
          next[name] = { sector, stage };
          changed = true;
          continue;
        }
        const mergedSector = !existing.sector && sector ? sector : existing.sector;
        const mergedStage = !existing.stage && stage ? stage : existing.stage;
        if (mergedSector !== existing.sector || mergedStage !== existing.stage) {
          next[name] = { sector: mergedSector, stage: mergedStage };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [edition, discoveredHydrated]);

  // Persist the discovered map when it changes.
  useEffect(() => {
    if (!discoveredHydrated) return;
    AsyncStorage.setItem(DISCOVERED_KEY, JSON.stringify(discovered)).catch(() => {});
  }, [discovered, discoveredHydrated]);

  // Load the accumulated AI-companies set once.
  useEffect(() => {
    AsyncStorage.getItem(AI_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setAiCompanies(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setAiHydrated(true));
  }, []);

  // Fold each edition's AI-flagged companies into the set (keyed by lowercased name).
  useEffect(() => {
    if (!aiHydrated) return;
    const names = editionAiCompanies(edition);
    if (names.length === 0) return;
    setAiCompanies((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const name of names) {
        const key = name.toLowerCase();
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [edition, aiHydrated]);

  // Persist the AI-companies set when it changes.
  useEffect(() => {
    if (!aiHydrated) return;
    AsyncStorage.setItem(AI_KEY, JSON.stringify(aiCompanies)).catch(() => {});
  }, [aiCompanies, aiHydrated]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(config.contentUrl, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!isEdition(data)) throw new Error('Malformed edition');
      setEdition(data);
      setSource('live');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
    } catch {
      // Keep whatever we already have (cache or sample) — never blank the screen.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const stageOf = useCallback((name: string) => stages[name], [stages]);

  const discoveredStartups = useMemo<DirectoryStartup[]>(
    () => Object.entries(discovered).map(([name, v]) => ({ name, sector: v.sector, stage: v.stage })),
    [discovered]
  );

  const usesAI = useCallback(
    (name: string) => isAiStartup(name) || !!aiCompanies[name.trim().toLowerCase()],
    [aiCompanies]
  );

  const value = useMemo<EditionContextValue>(
    () => ({ edition, source, loading, refresh, stageOf, discoveredStartups, usesAI }),
    [edition, source, loading, refresh, stageOf, discoveredStartups, usesAI]
  );

  return <EditionContext.Provider value={value}>{children}</EditionContext.Provider>;
}

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext);
  if (!ctx) throw new Error('useEdition must be used within an EditionProvider');
  return ctx;
}
