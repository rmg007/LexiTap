import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/presentation/theme';
import { SessionCompleteScreen } from '@/presentation/screens/SessionCompleteScreen';

function renderThemed(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider initialPreference="dark">{ui}</ThemeProvider>);
}

describe('SessionCompleteScreen — review variant (default, unchanged)', () => {
  it('renders the review headline + word-count line and fires onDone', async () => {
    const onDone = jest.fn();
    const { getByText, findByText } = await renderThemed(
      <SessionCompleteScreen
        wordsReviewed={5}
        streakIncremented={false}
        currentStreak={3}
        moreItemsAvailable={false}
        onDone={onDone}
        onKeepPracticing={jest.fn()}
      />,
    );
    await findByText("You're done for today");
    expect(getByText('5 words reviewed')).toBeTruthy();
    fireEvent.press(getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows Keep practicing only when more items remain', async () => {
    const { findByText } = await renderThemed(
      <SessionCompleteScreen
        wordsReviewed={5}
        streakIncremented={false}
        currentStreak={3}
        moreItemsAvailable
        onDone={jest.fn()}
        onKeepPracticing={jest.fn()}
      />,
    );
    await findByText('Keep practicing');

    const noMore = await renderThemed(
      <SessionCompleteScreen
        wordsReviewed={5}
        streakIncremented={false}
        currentStreak={3}
        moreItemsAvailable={false}
        onDone={jest.fn()}
        onKeepPracticing={jest.fn()}
      />,
    );
    expect(noMore.queryByText('Keep practicing')).toBeNull();
  });
});

describe('SessionCompleteScreen — learn variant (recap, DESIGN_LEVELUP_PLAN.md Phase 3.2)', () => {
  it('renders the "You met N new words today" headline and omits the redundant count line', async () => {
    const { findByText, queryByText } = await renderThemed(
      <SessionCompleteScreen
        variant="learn"
        wordsReviewed={7}
        streakIncremented={false}
        currentStreak={4}
        moreItemsAvailable={false}
        onDone={jest.fn()}
        onKeepPracticing={jest.fn()}
      />,
    );
    await findByText('You met 7 new words today.');
    expect(queryByText('7 words reviewed')).toBeNull();
  });

  it('uses singular "word" for a batch of exactly one', async () => {
    const { findByText } = await renderThemed(
      <SessionCompleteScreen
        variant="learn"
        wordsReviewed={1}
        streakIncremented={false}
        currentStreak={1}
        moreItemsAvailable={false}
        onDone={jest.fn()}
        onKeepPracticing={jest.fn()}
      />,
    );
    await findByText('You met 1 new word today.');
  });
});
