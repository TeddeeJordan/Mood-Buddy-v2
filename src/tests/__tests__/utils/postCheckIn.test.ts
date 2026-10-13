import { decidePostCheckIn } from '@/utils/postCheckIn';

describe('decidePostCheckIn (SPEC 3.10)', () => {
  it.each([
    { aiChatPromptShown: false, aiIntegrationEnabled: false },
    { aiChatPromptShown: false, aiIntegrationEnabled: true },
    { aiChatPromptShown: true, aiIntegrationEnabled: false },
    { aiChatPromptShown: true, aiIntegrationEnabled: true },
  ])('saves quietly without an API key (%j)', (rest) => {
    expect(decidePostCheckIn({ hasApiKey: false, ...rest })).toBe('saved');
  });

  it('shows the first-time dialog with a key and no prior prompt, whatever the toggle', () => {
    expect(
      decidePostCheckIn({ hasApiKey: true, aiChatPromptShown: false, aiIntegrationEnabled: false }),
    ).toBe('firstTimeDialog');
    expect(
      decidePostCheckIn({ hasApiKey: true, aiChatPromptShown: false, aiIntegrationEnabled: true }),
    ).toBe('firstTimeDialog');
  });

  it('asks "Talk about your mood?" with a key, prompted before and the toggle on', () => {
    expect(decidePostCheckIn({ hasApiKey: true, aiChatPromptShown: true, aiIntegrationEnabled: true })).toBe(
      'talkDialog',
    );
  });

  it('saves with a key, prompted before and the toggle off', () => {
    expect(decidePostCheckIn({ hasApiKey: true, aiChatPromptShown: true, aiIntegrationEnabled: false })).toBe(
      'saved',
    );
  });
});
