export const THEME_NAMES = ['lavender', 'sage', 'water'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

/** Settings mirrored in the Redux `settings` slice and persisted to MMKV. `hasApiKey` is deliberately absent. */
export interface PersistedSettings {
  theme: ThemeName;
  aiIntegrationEnabled: boolean;
  aiChatPromptShown: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

/** Last good ZenQuotes response (D21). */
export interface QuoteCache {
  q: string;
  a: string;
  localDate: string;
}
