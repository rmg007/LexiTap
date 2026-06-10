import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/presentation/theme';
import type { ColorTokens, Radii, Spacing } from '@/presentation/theme/tokens';
import { Text, Button, Card, Icon } from '@/presentation/components';
import type { TierConfigEntry } from '@/config/tiers';
import { listTiers } from '@/config/tiers';
import { useServices } from '@/presentation/services';

// Paywall — three one-time non-consumable products matching App Store Connect:
//   Foundation Pack ($9.99)  — full vocabulary access
//   Bundle Pack     ($24.99) — Foundation + all future packs (highlighted)
//   Upgrade Pack    ($19.99) — for Foundation owners upgrading to Bundle
//
// Accessibility:
// - "Unlock" copy (not "Subscribe"): Apple 3.1.1 — one-time IAP, no recurring billing.
// - Bundle card: accent background + "Best Value" badge.
// - All Pressables 48pt+ touch targets; primary Button 64px height.
// - Safe-area inset applied to header (notched device fix — TestFlight 2026-06-10).

export interface PaywallScreenProps {
  source?: string;
  onDismiss?: () => void;
  onSubscribe?: (packId: string) => void;
}

export function PaywallScreen({ source = 'paywall', onDismiss, onSubscribe }: PaywallScreenProps): React.JSX.Element {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { analytics, iap } = useServices();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    void analytics.track('paywall_viewed', { source });
  }, [analytics, source]);

  const handleDismiss = useCallback(() => {
    if (onDismiss) onDismiss();
    else router.back();
  }, [onDismiss]);

  const handlePurchase = useCallback(
    async (pack: TierConfigEntry) => {
      const unlock = pack.unlock;
      if (unlock.kind !== 'paid') return;
      const sku = unlock.sku;

      if (onSubscribe) {
        void analytics.track('purchase_initiated', { tier_id: pack.id, sku, amount: unlock.listPriceUsd });
        onSubscribe(pack.id);
        return;
      }

      void analytics.track('purchase_initiated', { tier_id: pack.id, sku, amount: unlock.listPriceUsd });
      setPurchasing(sku);
      try {
        const result = await iap.purchase(sku);
        switch (result.status) {
          case 'purchased':
            void analytics.track('purchase_completed', { sku, tier_id: pack.id, amount: unlock.listPriceUsd });
            if (onDismiss) onDismiss(); else router.back();
            break;
          case 'cancelled':
            void analytics.track('purchase_cancelled', { sku, tier_id: pack.id });
            break;
          case 'pending':
            void analytics.track('purchase_pending', { sku, tier_id: pack.id });
            break;
          case 'error':
            void analytics.track('purchase_error', { sku, tier_id: pack.id });
            break;
        }
      } finally {
        setPurchasing(null);
      }
    },
    [onSubscribe, onDismiss, analytics, iap],
  );

  const paidTiers = listTiers().filter((t) => t.unlock.kind === 'paid' && t.isActive);
  const bundle   = paidTiers.find((t) => t.id === 'bundle');
  const others   = paidTiers.filter((t) => t.id !== 'bundle');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <View
        style={{
          paddingHorizontal: spacing.s4,
          paddingTop: spacing.s4 + insets.top,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          Unlock LexiTap
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss paywall"
          onPress={handleDismiss}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: spacing.s3 })}
        >
          <Icon name="x" size={24} colorValue={colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.s4,
          paddingVertical: spacing.s4,
          gap: spacing.s4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="body" color="textSecondary">
          One-time purchase, forever access. No subscriptions, no recurring charges.
        </Text>

        {/* Bundle card (Best Value — shown first and highlighted) */}
        {bundle && (
          <View style={{ marginTop: spacing.s2 }}>
            <View
              style={{
                position: 'absolute',
                top: -10,
                left: spacing.s4,
                backgroundColor: colors.accent,
                paddingHorizontal: spacing.s3,
                paddingVertical: 4,
                borderRadius: radii.sm,
                zIndex: 10,
              }}
            >
              <Text variant="caption" color="onAccent" style={{ fontWeight: '600' }}>
                Best Value
              </Text>
            </View>
            <ProductCard
              tier={bundle}
              isHighlighted={true}
              isLoading={purchasing === (bundle.unlock.kind === 'paid' ? bundle.unlock.sku : null)}
              onPress={() => void handlePurchase(bundle)}
              spacing={spacing}
              colors={colors}
              radii={radii}
            />
          </View>
        )}

        {/* Foundation + Upgrade cards */}
        <View style={{ gap: spacing.s3 }}>
          {others.map((pack) => (
            <ProductCard
              key={pack.id}
              tier={pack}
              isHighlighted={false}
              isLoading={purchasing === (pack.unlock.kind === 'paid' ? pack.unlock.sku : null)}
              onPress={() => void handlePurchase(pack)}
              spacing={spacing}
              colors={colors}
              radii={radii}
            />
          ))}
        </View>

        <View style={{ marginTop: spacing.s2, paddingBottom: spacing.s4 }}>
          <Text variant="caption" color="textTertiary" style={{ textAlign: 'center', lineHeight: 18 }}>
            All purchases are non-consumable one-time unlocks.{'\n'}
            No subscriptions, no recurring charges.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  tier: TierConfigEntry;
  isHighlighted: boolean;
  isLoading: boolean;
  onPress: () => void;
  spacing: Spacing;
  colors: ColorTokens;
  radii: Radii;
}

function ProductCard({
  tier,
  isHighlighted,
  isLoading,
  onPress,
  spacing: sp,
  colors,
  radii: r,
}: ProductCardProps): React.JSX.Element {
  const unlock = tier.unlock;
  const price = unlock.kind === 'paid' ? unlock.listPriceUsd : null;

  return (
    <Card
      raised={isHighlighted}
      style={{
        backgroundColor: isHighlighted ? colors.accentSubtle : undefined,
        marginTop: isHighlighted ? sp.s2 : 0,
        borderColor: isHighlighted ? colors.accent : undefined,
      }}
    >
      <View style={{ gap: sp.s3 }}>
        <View style={{ flexDirection: 'row', gap: sp.s4, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: r.sm,
              backgroundColor: colors.bgSurfaceRaised,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            accessible={false}
          >
            <Icon name="library" size={28} colorValue={colors.accent} />
          </View>

          <View style={{ flex: 1, gap: sp.s1 }}>
            <Text variant="headline" color="textPrimary">
              {tier.displayName}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {tier.description}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: sp.s3 }}>
          {price !== null && (
            <Text variant="title" color="accent" accessibilityLabel={`$${price.toFixed(2)}`}>
              ${price.toFixed(2)}
            </Text>
          )}
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} accessibilityLabel="Purchase in progress" />
          ) : (
            <Button
              label="Unlock"
              variant="primary"
              onPress={onPress}
              accessibilityLabel={`Unlock ${tier.displayName} for $${price?.toFixed(2) ?? ''}`}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
