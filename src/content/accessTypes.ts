/**
 * Daily access code — the `access.json` DATA CONTRACT.
 *
 * A sibling of the daily Edition (see types.ts) and startup-news (see newsTypes.ts).
 * It gates the "extended" favorites tier (up to 6 startups vs 1). Each morning the
 * generation pipeline mints a fresh human-readable passphrase, then publishes ONLY a
 * salted SHA-256 of it — never the passphrase itself. The owner (Pierre) hands the
 * plaintext out on request (LinkedIn); the app verifies it offline against the hash.
 *
 *   { date: "AAAA-MM-JJ", algo: "sha256", salt: "<per-day random>", hash: "<64 hex>", hint?: "…" }
 *
 * Security note: this is FRICTION, not a vault. A native client cannot keep a secret,
 * so a determined user can extract the day's hash. The daily rotation only caps how
 * long a shared code stays valid (~24 h) — enough to make people ask for a fresh one.
 * See docs/perso-favoris.md.
 */
import { sha256Hex } from '@/lib/sha256';

export type AccessManifest = {
  /** ISO date AAAA-MM-JJ this code is valid for — freshness/display only. */
  date: string;
  /** Digest algorithm. Only 'sha256' is understood. */
  algo: 'sha256';
  /** Per-day random salt, published alongside the hash. */
  salt: string;
  /** Lowercase hex sha256(salt + ':' + canonicalCode(code)). */
  hash: string;
  /** Optional public hint shown on the unlock screen (never the code itself). */
  hint?: string;
};

/**
 * Canonical form of a typed code, so trivial input differences don't block a valid
 * unlock. MUST stay identical to the generation pipeline (see daily-content/GENERATION.md):
 * trim, lowercase, collapse internal whitespace.
 */
export function canonicalCode(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True if `input` is the code behind this manifest. Pure + offline. */
export function verifyCode(manifest: AccessManifest, input: string): boolean {
  const code = canonicalCode(input);
  if (!code) return false;
  return sha256Hex(`${manifest.salt}:${code}`) === manifest.hash.toLowerCase();
}

/** Minimal runtime check that a fetched object looks like an AccessManifest. */
export function isAccessManifest(value: unknown): value is AccessManifest {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.date === 'string' &&
    a.algo === 'sha256' &&
    typeof a.salt === 'string' &&
    a.salt.length > 0 &&
    typeof a.hash === 'string' &&
    /^[0-9a-fA-F]{64}$/.test(a.hash) &&
    (a.hint === undefined || typeof a.hint === 'string')
  );
}
