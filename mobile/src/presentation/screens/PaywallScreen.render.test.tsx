import { PaywallScreen } from '@/presentation/screens/PaywallScreen';
import { darkColors } from '@/presentation/theme';
import { defaultServices, renderWithProviders } from '@/test-utils/renderWithProviders';

// DESIGN_LEVELUP_PLAN.md coverage-gap audit: Paywall renders 3 active paid
// tiers (foundation/bundle/upgrade) at once, each with its own "Unlock"
// button. Before this fix all 3 were variant="primary" -- the same
// simultaneous-teal-gradient bug Home had with Resume + Start review, just
// with 3 buttons instead of 2. Only the highlighted/recommended (Bundle,
// "Best Value") pack should render the primary gradient button now.
//
// Button's primary variant labels itself color="onAccent" (white-on-teal);
// every other variant uses accentText/destructive -- never onAccent. Counting
// onAccent-colored "Unlock" labels is a robust proxy for "how many primary
// buttons rendered" without reaching into Button's internal Pressable/
// LinearGradient tree shape.

function textColorOf(node: { props: { style?: unknown } }): unknown {
  const style = node.props.style;
  const flat = Array.isArray(style) ? style.flat(Infinity) : [style];
  return flat.find((s) => s != null && typeof s === 'object' && 'color' in s)?.color;
}

describe('PaywallScreen — single scarce-teal primary across 3 simultaneous packs', () => {
  it('renders exactly one primary (onAccent-colored) Unlock button among the 3 packs', async () => {
    const { getAllByText } = await renderWithProviders(<PaywallScreen />, defaultServices());

    const unlockLabels = getAllByText('Unlock');
    expect(unlockLabels).toHaveLength(3);

    const primaryCount = unlockLabels.filter((n) => textColorOf(n) === darkColors.onAccent).length;
    expect(primaryCount).toBe(1);
  });
});
