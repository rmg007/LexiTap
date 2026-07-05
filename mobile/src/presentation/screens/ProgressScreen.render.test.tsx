import { fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
}));

import { ProgressScreen } from '@/presentation/screens/ProgressScreen';
import { defaultServices, renderWithProviders } from '@/test-utils/renderWithProviders';

// Proves the Progress "Saved words" section (WORD_FEEDBACK_PLAN §2): hidden when
// the count is 0, visible with the count when > 0, and navigating on press.

describe('ProgressScreen — saved words section', () => {
  beforeEach(() => mockPush.mockClear());

  it('hides the saved-words section when the count is 0', async () => {
    const services = defaultServices({ getSavedWordCount: async () => 0 });
    const { queryByText, findByText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Progress');
    expect(queryByText('Saved words')).toBeNull();
  });

  it('shows the section with the count and navigates on press', async () => {
    const services = defaultServices({ getSavedWordCount: async () => 4 });
    const { findByText, getByLabelText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Saved words');
    fireEvent.press(getByLabelText('Saved words, 4'));
    expect(mockPush).toHaveBeenCalledWith('/saved-words');
  });
});
