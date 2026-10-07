/** Every MMKV key (SPEC §2.8). Values are typed through src/services/storage/settingsStorage.ts. */
export const MMKV_KEYS = {
  theme: 'theme',
  reminderEnabled: 'reminder_enabled',
  reminderHour: 'reminder_hour',
  reminderMinute: 'reminder_minute',
  aiIntegrationEnabled: 'ai_integration_enabled',
  aiChatPromptShown: 'ai_chat_prompt_shown',
  reminderTz: 'reminder_tz',
  tzChangeDetectedAt: 'tz_change_detected_at',
  quoteCache: 'quote_cache',
  installInitialized: 'install_initialized',
} as const;

export type MmkvKey = (typeof MMKV_KEYS)[keyof typeof MMKV_KEYS];

/** SecureStore keys. The API key never goes to MMKV, Redux or logs (D2). */
export const SECURE_KEYS = {
  anthropicApiKey: 'anthropic_api_key',
} as const;

/** MMKV instance id. */
export const MMKV_INSTANCE_ID = 'mood-buddy';
