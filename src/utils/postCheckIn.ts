export type PostCheckInOutcome = 'saved' | 'firstTimeDialog' | 'talkDialog';

export interface PostCheckInInput {
  hasApiKey: boolean;
  aiChatPromptShown: boolean;
  aiIntegrationEnabled: boolean;
}

/**
 * What follows a successful check-in (§3.10, D19):
 * no key → "Saved!"; key + not yet prompted → first-time dialog;
 * key + prompted + toggle on → "Talk about your mood?"; key + prompted + toggle off → "Saved!".
 */
export function decidePostCheckIn({
  hasApiKey,
  aiChatPromptShown,
  aiIntegrationEnabled,
}: PostCheckInInput): PostCheckInOutcome {
  if (!hasApiKey) return 'saved';
  if (!aiChatPromptShown) return 'firstTimeDialog';
  return aiIntegrationEnabled ? 'talkDialog' : 'saved';
}
