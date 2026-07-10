/**
 * App configuration.
 *
 * The app is fully native. Its daily content lives in a single JSON file hosted at
 * a fixed URL (e.g. GitHub Pages). Each morning the generation task publishes a new
 * `edition.json` shaped like `Edition` (see src/content/types.ts), and the app
 * downloads it on launch / pull-to-refresh. If it can't be reached, the app falls
 * back to the last cached edition, then to the bundled sample.
 *
 * Change this one value to point the app at your published edition.
 *   Expected: https://<user>.github.io/<repo>/edition.json
 *
 * Until that file exists, the app simply runs on the bundled sample edition.
 */
export const config = {
  /** URL of the daily edition JSON. */
  contentUrl: 'https://pierreespy.github.io/vantage-content/edition.json',
  /** URL of the per-startup news JSON (sibling of contentUrl). */
  newsUrl: 'https://pierreespy.github.io/vantage-content/startup-news.json',
  /** URL of the daily access-code manifest (sibling of contentUrl). Gates the
   *  extended favorites tier; see src/content/accessTypes.ts. */
  accessUrl: 'https://pierreespy.github.io/vantage-content/access.json',
  /** Where users are sent to request the day's access code. TODO: confirm the exact
   *  LinkedIn profile URL. */
  contactLinkedInUrl: 'https://www.linkedin.com/in/pierre-comelait',
} as const;
