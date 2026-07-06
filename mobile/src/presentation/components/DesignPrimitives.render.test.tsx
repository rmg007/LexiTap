import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/presentation/theme';
import { EmptyState } from '@/presentation/components/EmptyState';
import { SectionHeader } from '@/presentation/components/SectionHeader';
import { ListRow } from '@/presentation/components/ListRow';
import { layout } from '@/presentation/theme/tokens';

// RTL 14's render() is async under React 19 (act flushing) — every call site
// below must await it.
function renderThemed(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider initialPreference="dark">{ui}</ThemeProvider>);
}

// Recursively search a rendered JSON tree (react-test-renderer's toJSON node
// shape: {type, props, children}) for any node whose style includes the
// given key/value pair (style may be an object or an array of objects).
function styleTreeContains(node: unknown, key: string, value: unknown): boolean {
  if (node == null || typeof node !== 'object') return false;
  const n = node as { props?: { style?: unknown }; children?: unknown[] | null };
  const rawStyle = n.props?.style;
  const styles = Array.isArray(rawStyle) ? rawStyle.flat(Infinity) : rawStyle != null ? [rawStyle] : [];
  if (styles.some((s) => s != null && typeof s === 'object' && (s as Record<string, unknown>)[key] === value)) {
    return true;
  }
  return (n.children ?? []).some((child) => styleTreeContains(child, key, value));
}

describe('EmptyState', () => {
  it('renders headline + body, no CTA when omitted', async () => {
    const { getByText, queryByRole } = await renderThemed(
      <EmptyState headline="All caught up" body="Come back tomorrow." />,
    );
    expect(getByText('All caught up')).toBeTruthy();
    expect(getByText('Come back tomorrow.')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('renders a CTA button and fires onPressCta', async () => {
    const onPressCta = jest.fn();
    const { getByText } = await renderThemed(
      <EmptyState headline="Nothing saved yet" ctaLabel="Browse words" onPressCta={onPressCta} />,
    );
    fireEvent.press(getByText('Browse words'));
    expect(onPressCta).toHaveBeenCalledTimes(1);
  });
});

describe('SectionHeader', () => {
  it('renders the eyebrow label text', async () => {
    const { getByText } = await renderThemed(<SectionHeader>EXAMPLES</SectionHeader>);
    expect(getByText('EXAMPLES')).toBeTruthy();
  });
});

describe('ListRow', () => {
  it('renders label/subtitle/value and enforces the 48px touch target', async () => {
    const utils = await renderThemed(
      <ListRow label="Longest streak" subtitle="Personal best" value="12 days" />,
    );
    expect(utils.getByText('Longest streak')).toBeTruthy();
    expect(utils.getByText('Personal best')).toBeTruthy();
    expect(utils.getByText('12 days')).toBeTruthy();
    expect(styleTreeContains(utils.toJSON(), 'minHeight', layout.minTouchTarget)).toBe(true);
  });

  it('is tappable with onPress and fires the handler', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderThemed(<ListRow label="Saved words" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('bumps a destructive label to bodyLg — strictly larger than the default body size — to hold AA contrast', async () => {
    // Absolute px values shift with the test host's reported font scale, so
    // compare the two variants against each other rather than a literal 18.
    const fontSizeOf = (utils: Awaited<ReturnType<typeof render>>, text: string): number => {
      const node = utils.getByText(text);
      const styles = Array.isArray(node.props.style) ? node.props.style.flat(Infinity) : [node.props.style];
      const withSize = styles.find((s: { fontSize?: number }) => typeof s?.fontSize === 'number');
      return withSize.fontSize as number;
    };

    const normal = await renderThemed(<ListRow label="Restore purchases" />);
    const destructive = await renderThemed(<ListRow label="Delete account" labelColor="destructive" />);

    expect(fontSizeOf(destructive, 'Delete account')).toBeGreaterThan(
      fontSizeOf(normal, 'Restore purchases'),
    );
  });
});
