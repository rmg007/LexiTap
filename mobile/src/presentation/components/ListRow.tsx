import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Icon, type IconName } from '@/presentation/components/Icon';
import type { ColorTokens } from '@/presentation/theme/tokens';

// ─── ListRow ──────────────────────────────────────────────────────────────────
// Shared list-row primitive (Figma uses this for Home rows, Progress stats,
// Profile, Settings) — enforces the WCAG 2.2 AA 48px minimum touch target via
// layout.minTouchTarget for every tappable row in the app, fixing the live
// sub-48px Saved-words Pressable bug (ProgressScreen.tsx).
//
// Destructive caveat: `destructive` (#E5484D) on `bgSurface` measures ≈4.47:1 —
// just under the 4.5:1 AA text threshold. `labelColor="destructive"` bumps the
// label to `bodyLg` (18px) instead of `body` (15px), which drops to the 3:1
// large-text threshold and passes; callers must not override the font size.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListRowProps {
  label: string;
  subtitle?: string;
  /** Right-aligned secondary text (e.g. a stat value: "12 days"). */
  value?: string;
  leadingIcon?: IconName;
  /** Custom right-side content (switch, custom icon) — overrides the default chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  labelColor?: keyof ColorTokens;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  showChevron?: boolean;
}

export function ListRow({
  label,
  subtitle,
  value,
  leadingIcon,
  trailing,
  onPress,
  disabled = false,
  labelColor = 'textPrimary',
  accessibilityLabel,
  accessibilityHint,
  showChevron = true,
}: ListRowProps): React.JSX.Element {
  const { spacing, layout } = useTheme();
  const isDestructive = labelColor === 'destructive';

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.minTouchTarget,
        gap: spacing.s3,
        paddingVertical: spacing.s2,
      }}
    >
      {leadingIcon != null && <Icon name={leadingIcon} size={20} color="textTertiary" />}
      <View style={{ flex: 1 }}>
        <Text variant={isDestructive ? 'bodyLg' : 'body'} color={labelColor}>
          {label}
        </Text>
        {subtitle != null && (
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {value != null && (
        <Text variant="body" color="textSecondary">
          {value}
        </Text>
      )}
      {trailing !== undefined
        ? trailing
        : showChevron && onPress !== undefined && (
            <Icon name="chevron-right" size={18} color="textTertiary" />
          )}
    </View>
  );

  if (onPress === undefined) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.55 : 1 })}
    >
      {content}
    </Pressable>
  );
}
