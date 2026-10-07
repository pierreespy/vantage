/**
 * Chaînes d'interface traduites (FR par défaut, EN).
 *
 * Seule l'interface (« chrome ») est traduite : le contenu éditorial de l'`Edition`
 * reste dans la langue où il est généré. Ajouter une langue = ajouter une entrée ici
 * (le type `Strings` force la complétude).
 */
export type Language = 'fr' | 'en';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

const fr = {
  tabs: {
    journal: 'Journal',
    favoris: 'Favoris',
    motDuJour: 'Mot du jour',
    reglages: 'Réglages',
  },
  settings: {
    title: 'Réglages',
    sectionLanguage: 'Langue',
    languageHint: "Langue de l'interface. Le contenu éditorial reste en français.",
    sectionNotifications: 'Notifications',
    morningReminder: 'Rappel du matin',
    morningReminderHint: "Une notification à 7h30 quand l'édition du jour est en ligne.",
    notifDeniedHint: 'Autorisation refusée : activez les notifications dans Réglages iOS.',
    sectionExperience: 'Expérience',
    haptics: 'Retours haptiques',
    hapticsHint: 'Vibrations légères au toucher.',
    sectionPrivacy: 'Confidentialité',
    favSync: 'Partage anonyme des favoris',
    favSyncHint: 'Aide à prioriser la veille des startups suivies. Aucune donnée personnelle.',
    resetFavorites: 'Effacer mes favoris',
    resetConfirmTitle: 'Effacer les favoris ?',
    resetConfirmBody: 'Vos favoris et leur partage anonyme seront supprimés.',
    cancel: 'Annuler',
    confirm: 'Effacer',
    sectionAbout: 'À propos',
    version: 'Version',
  },
};

export type Strings = typeof fr;

const en: Strings = {
  tabs: {
    journal: 'Journal',
    favoris: 'Favourites',
    motDuJour: 'Word of the day',
    reglages: 'Settings',
  },
  settings: {
    title: 'Settings',
    sectionLanguage: 'Language',
    languageHint: 'Interface language. Editorial content stays in French.',
    sectionNotifications: 'Notifications',
    morningReminder: 'Morning reminder',
    morningReminderHint: "A notification at 7:30 when today's edition is live.",
    notifDeniedHint: 'Permission denied: enable notifications in iOS Settings.',
    sectionExperience: 'Experience',
    haptics: 'Haptic feedback',
    hapticsHint: 'Light vibrations on touch.',
    sectionPrivacy: 'Privacy',
    favSync: 'Anonymous favourites sharing',
    favSyncHint: 'Helps prioritise coverage of followed startups. No personal data.',
    resetFavorites: 'Clear my favourites',
    resetConfirmTitle: 'Clear favourites?',
    resetConfirmBody: 'Your favourites and their anonymous sharing will be removed.',
    cancel: 'Cancel',
    confirm: 'Clear',
    sectionAbout: 'About',
    version: 'Version',
  },
};

export const STRINGS: Record<Language, Strings> = { fr, en };
