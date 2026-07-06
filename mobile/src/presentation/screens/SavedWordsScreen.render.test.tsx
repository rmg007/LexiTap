import { fireEvent, waitFor } from '@testing-library/react-native';
import { SavedWordsScreen } from '@/presentation/screens/SavedWordsScreen';
import type { SavedWordListItem, MasteryLevel } from '@/domain/index';
import { BATCH, defaultServices, renderWithProviders } from '@/test-utils/renderWithProviders';

// Proves the Saved-words list (WORD_FEEDBACK_PLAN §2): renders saved items,
// shows an empty state when there are none, and removing a row calls unsaveWord
// and drops it from the list.

function item(index: number, savedAt: number): SavedWordListItem {
  return { word: BATCH[index]!, savedAt, masteryLevel: 0 as MasteryLevel };
}

describe('SavedWordsScreen (render)', () => {
  it('shows the empty state when there are no saved words', async () => {
    const services = defaultServices({ listSavedWordsPage: async () => [] });
    const { findByText } = await renderWithProviders(
      <SavedWordsScreen onExit={jest.fn()} />,
      services,
    );
    await findByText('No saved words yet');
  });

  it('renders saved items with word + definition', async () => {
    const services = defaultServices({
      listSavedWordsPage: async () => [item(0, 3000), item(1, 2000)],
    });
    const { findByText, getByText } = await renderWithProviders(
      <SavedWordsScreen onExit={jest.fn()} />,
      services,
    );
    await findByText(BATCH[0]!.word);
    expect(getByText(BATCH[1]!.word)).toBeTruthy();
  });

  it('removing a row calls unsaveWord and drops it', async () => {
    const unsaveWord = jest.fn(async () => undefined);
    let page: SavedWordListItem[] = [item(0, 3000)];
    const services = defaultServices({
      listSavedWordsPage: async () => page,
      unsaveWord: unsaveWord as unknown as () => Promise<void>,
    });
    const utils = await renderWithProviders(<SavedWordsScreen onExit={jest.fn()} />, services);
    await utils.findByText(BATCH[0]!.word);
    page = []; // no refetch happens, but keep the stub consistent
    fireEvent.press(utils.getByLabelText(`Remove ${BATCH[0]!.word} from saved`));
    expect(unsaveWord).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(utils.queryByText(BATCH[0]!.word)).toBeNull());
  });
});
