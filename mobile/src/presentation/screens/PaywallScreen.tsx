import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/presentation/theme';
import type { ColorTokens, Radii, Spacing } from '@/presentation/theme/tokens';
import { Text, Button, Card } from '@/presentation/components';
import type { TierConfigEntry } from '@/config/tiers';
import { listTiers } from '@/config/tiers';
import { useServices } from '@/presentation/services';

// P-3: Paywall screen for exam pack SKUs. Displays paid tiers (exam packs +
// bundle) with product cards. Placeholder buttons (R1: RevenueCat integration
// pending). Dismiss routes back to home.
//
// Accessibility:
// - Header + product cards accessible via screen reader.
// - "Subscribe" buttons: 64px primary (teal gradient) — WCAG AA 48pt minimum.
// - Bundle card highlighted with accent background + "Best value" badge.
// - Focus order: top-to-bottom (dismiss first, then products, then CTA).
// - Contrast: 4.5:1 on price/description text; on-accent label on primary button.
// - Dynamic Type: all text scales with OS setting (useScaledFont).

export interface PaywallScreenProps {
  source?: string;
  onDismiss?: () => void;
  onSubscribe?: (packId: string) => void;
}

export function PaywallScreen({ source = 'paywall', onDismiss, onSubscribe }: PaywallScreenProps): React.JSX.Element {
  const { colors, spacing, radii } = useTheme();
  const { analytics, iap } = useServices();
  // sku of the in-progress purchase (null = idle)
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Fire paywall_viewed event on mount.
  useEffect(() => {
    void analytics.track('paywall_viewed', { source });
  }, [analytics, source]);

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    } else {
      router.back();
    }
  }, [onDismiss]);

  const handleSubscribe = useCallback(
    async (pack: TierConfigEntry) => {
      const unlock = pack.unlock;
      if (unlock.kind !== 'exam_pack') return;

      const sku = unlock.sku;

      if (onSubscribe) {
        // Delegate to parent (used in onboarding route).
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
            // Ask-to-Buy: parental approval pending — inform user, no dismiss.
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

  // Filter to paid exam packs + bundle only (unlock.kind === 'exam_pack')
  const paidTiers = listTiers().filter((t) => t.unlock.kind === 'exam_pack');
  // Bundle is the full all-exams SKU (29.99); identify it
  const bundle = paidTiers.find((t) => t.unlock.kind === 'exam_pack' && t.unlock.listPriceUsd === 29.99);
  const examPacks = paidTiers.filter((t) => t !== bundle);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Header + Dismiss button */}
      <View style={{ paddingHorizontal: spacing.s4, paddingTop: spacing.s4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          Unlock Exam Prep
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss paywall"
          onPress={handleDismiss}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: spacing.s2,
          })}
        >
          <Text variant="label" color="accent">
            ✕
          </Text>
        </Pressable>
      </View>

      {/* Scrollable product cards */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.s4,
          paddingVertical: spacing.s4,
          gap: spacing.s4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header description */}
        <Text variant="body" color="textSecondary">
          Access exam prep vocabulary, advanced content, and more. One-time purchase, forever access.
        </Text>

        {/* Exam pack cards */}
        <View style={{ gap: spacing.s3 }}>
          {examPacks.map((pack) => (
            <ProductCard
              key={pack.id}
              tier={pack}
              isBundle={false}
              onPress={() => void handleSubscribe(pack)}
              isLoading={purchasing === (pack.unlock.kind === 'exam_pack' ? pack.unlock.sku : null)}
              spacing={spacing}
              colors={colors}
              radii={radii}
            />
          ))}
        </View>

        {/* Bundle card (highlighted) */}
        {bundle && (
          <View style={{ marginTop: spacing.s4 }}>
            <View
              style={{
                position: 'absolute',
                top: -8,
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
              key={bundle.id}
              tier={bundle}
              isBundle={true}
              onPress={() => void handleSubscribe(bundle)}
              isLoading={purchasing === (bundle.unlock.kind === 'exam_pack' ? bundle.unlock.sku : null)}
              spacing={spacing}
              colors={colors}
              radii={radii}
            />
          </View>
        )}

        {/* Footer info */}
        <View style={{ marginTop: spacing.s4, paddingBottom: spacing.s4 }}>
          <Text
            variant="caption"
            color="textTertiary"
            style={{ textAlign: 'center', lineHeight: 18 }}
          >
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
  isBundle: boolean;
  isLoading: boolean;
  onPress: () => void;
  spacing: Spacing;
  colors: ColorTokens;
  radii: Radii;
}

function ProductCard({
  tier,
  isBundle,
  isLoading,
  onPress,
  spacing: sp,
  colors,
  radii: r,
}: ProductCardProps): React.JSX.Element {
  const unlock = tier.unlock;
  const price = unlock.kind === 'exam_pack' ? unlock.listPriceUsd : null;

  return (
    <Card
      raised={isBundle}
      style={{
        backgroundColor: isBundle ? colors.accentSubtle : undefined,
        marginTop: isBundle ? sp.s2 : 0,
        borderColor: isBundle ? colors.accent : undefined,
      }}
    >
      <View style={{ gap: sp.s3 }}>
        {/* Icon placeholder + title */}
        <View style={{ flexDirection: 'row', gap: sp.s4, alignItems: 'flex-start' }}>
          {/* Mock icon — placeholder emoji/SVG later */}
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
            <Text variant="headline" color="accent">
              📚
            </Text>
          </View>

          {/* Title + description */}
          <View style={{ flex: 1, gap: sp.s1 }}>
            <Text variant="headline" color="textPrimary">
              {tier.displayName}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {tier.description}
            </Text>
          </View>
        </View>

        {/* Price + CTA row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: sp.s3 }}>
          {price !== null && (
            <Text variant="title" color="accent" accessibilityLabel={`$${price.toFixed(2)}`}>
              ${price.toFixed(2)}
            </Text>
          )}
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              accessibilityLabel="Purchase in progress"
            />
          ) : (
            <Button
              label="Subscribe"
              variant="primary"
              onPress={onPress}
              accessibilityLabel={`Subscribe to ${tier.displayName} for $${price?.toFixed(2) ?? 'contact'}`}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
