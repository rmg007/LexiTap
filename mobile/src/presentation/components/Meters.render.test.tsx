import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/presentation/theme';
import { DailyCapMeter } from '@/presentation/components/DailyCapMeter';
import { KnowledgeMapBar } from '@/presentation/components/KnowledgeMapBar';
import { knowledgeMapSegments } from '@/domain/gamification/mastery';

function renderThemed(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider initialPreference="dark">{ui}</ThemeProvider>);
}

describe('DailyCapMeter', () => {
  it('exposes a progressbar with an X of Y label, not complete mid-fill', async () => {
    const { getByLabelText } = await renderThemed(<DailyCapMeter completed={8} cap={15} />);
    const node = getByLabelText('8 of 15 reviews');
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 1, now: 8 / 15 });
  });

  it('flips the label to complete at cap', async () => {
    const { getByLabelText } = await renderThemed(<DailyCapMeter completed={15} cap={15} />);
    expect(getByLabelText('15 of 15 reviews, complete')).toBeTruthy();
  });

  it('treats a zero cap as an empty, non-complete meter', async () => {
    const { getByLabelText } = await renderThemed(<DailyCapMeter completed={0} cap={0} />);
    const node = getByLabelText('0 of 0 reviews');
    expect(node.props.accessibilityValue.now).toBe(0);
  });
});

describe('KnowledgeMapBar', () => {
  it('exposes a combined known/learning/new accessibility label', async () => {
    const segments = knowledgeMapSegments([0, 0, 1, 2, 5, 5, 5]);
    const { getByLabelText } = await renderThemed(<KnowledgeMapBar segments={segments} />);
    expect(getByLabelText('3 of 7 known, 2 learning, 2 new')).toBeTruthy();
  });

  it('renders the legend only when showLegend is true', async () => {
    const segments = knowledgeMapSegments([5, 2, 0]);
    const without = await renderThemed(<KnowledgeMapBar segments={segments} />);
    expect(without.queryByText(/Known ·/)).toBeNull();

    const withLegend = await renderThemed(<KnowledgeMapBar segments={segments} showLegend />);
    expect(withLegend.getByText('Known · 1')).toBeTruthy();
    expect(withLegend.getByText('Learning · 1')).toBeTruthy();
    expect(withLegend.getByText('New · 1')).toBeTruthy();
  });
});
