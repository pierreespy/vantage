/**
 * Bundled fallback access manifest — the offline/sample counterpart of sampleEdition.
 *
 * Its code is intentionally public (`vantage-demo`): it only ever applies when the
 * app can't reach the live access.json (first cold start offline, or before the file
 * exists). Real unlocking uses the day's live code, which the owner distributes. Once
 * a user has unlocked, the extended tier is persisted locally and no longer depends on
 * this file. See docs/perso-favoris.md.
 */
import type { AccessManifest } from './accessTypes';

export const sampleAccess: AccessManifest = {
  date: '2026-07-10',
  algo: 'sha256',
  salt: 'vantage-sample-salt-v1',
  // sha256('vantage-sample-salt-v1:vantage-demo')
  hash: 'a0676552852754d1cc999821e7373bdea17606d0dcae2ca9ae48638802e7a17f',
  hint: 'Démo hors-ligne — le vrai code du jour s’obtient sur LinkedIn.',
};
