import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/presentation/theme';
import { ExitSessionSheet } from '@/presentation/screens/ExitSessionSheet';

function renderThemed(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider initialPreference="dark">{ui}</ThemeProvider>);
}

// DESIGN_LEVELUP_PLAN.md Phase 4.2 — the sheet reframed as a calm decision
// ("Take a break?") rather than pure reassurance, with tap-outside-to-dismiss
// added (previously only the two buttons could dismiss it, despite the
// component's own doc comment claiming otherwise).

describe('ExitSessionSheet', () => {
  it('renders the calm-decision copy', async () => {
    const { findByText } = await renderThemed(
      <ExitSessionSheet visible onLeave={jest.fn()} onKeepGoing={jest.fn()} />,
    );
    await findByText('Take a break?');
    await findByText('Your progress is saved — you can continue from this word later.');
  });

  it('"Keep studying" (primary, safe default) fires onKeepGoing', async () => {
    const onKeepGoing = jest.fn();
    const { findByText } = await renderThemed(
      <ExitSessionSheet visible onLeave={jest.fn()} onKeepGoing={onKeepGoing} />,
    );
    fireEvent.press(await findByText('Keep studying'));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
  });

  it('"Pause for now" (secondary) fires onLeave — the snapshot stays resumable', async () => {
    const onLeave = jest.fn();
    const { findByText } = await renderThemed(
      <ExitSessionSheet visible onLeave={onLeave} onKeepGoing={jest.fn()} />,
    );
    fireEvent.press(await findByText('Pause for now'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('tapping outside the sheet (the scrim) fires onKeepGoing, not onLeave', async () => {
    const onKeepGoing = jest.fn();
    const onLeave = jest.fn();
    const { getByTestId } = await renderThemed(
      <ExitSessionSheet visible onLeave={onLeave} onKeepGoing={onKeepGoing} />,
    );
    fireEvent.press(getByTestId('exit-sheet-scrim'));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });
});
