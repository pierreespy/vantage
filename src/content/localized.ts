/**
 * Contenu localisé : pour une langue ≠ fr, la routine publie un fichier frère
 * suffixé (`edition.json` → `edition.en.json`). Si la version traduite n'existe pas
 * (encore), on retombe sur le fichier français — l'écran n'est jamais vide.
 */
import type { Language } from '@/i18n/strings';

export function localizedUrl(url: string, language: Language): string {
  return language === 'fr' ? url : url.replace(/\.json$/, `.${language}.json`);
}

/** Clé de cache par langue (fr garde la clé historique). */
export function localizedKey(key: string, language: Language): string {
  return language === 'fr' ? key : `${key}.${language}`;
}

/** Télécharge la version traduite, sinon la version française. Lève si aucune n'est valide. */
export async function fetchLocalized<T>(
  url: string,
  language: Language,
  validate: (data: unknown) => T | null
): Promise<{ data: T; language: Language }> {
  const tries: Language[] = language === 'fr' ? ['fr'] : [language, 'fr'];
  for (const lang of tries) {
    try {
      const res = await fetch(localizedUrl(url, lang), { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = validate(await res.json());
      if (data !== null) return { data, language: lang };
    } catch {
      // try next
    }
  }
  throw new Error('No content available');
}
