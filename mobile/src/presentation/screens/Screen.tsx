import React, { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/presentation/theme';

// Screen scaffold: safe-area + base background + gutter + content max-width cap
// (600 for tablets, DESIGN_SYSTEM.md). Scrollable by default.

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /**
   * Fixed footer rendered below the scrollable content, inside the same
   * SafeAreaView (bottom inset applied once, by the SafeAreaView itself) —
   * e.g. a primary CTA that should stay pinned regardless of content length.
   * Its measured height is fed back as scroll content's bottom padding so
   * the footer never overlaps the last piece of content. Only applies when
   * `scroll` is true (the default): a non-scrolling screen's content already
   * fills the available height via flex, so no separate slot is needed.
   */
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  footer,
}: ScreenProps): React.JSX.Element {
  const { colors, spacing, layout } = useTheme();
  const [footerHeight, setFooterHeight] = useState(0);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const inner: ViewStyle = {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.s4,
    gap: spacing.s4,
    flexGrow: 1,
  };

  const showFooter = scroll && footer != null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={
            showFooter ? [inner, { paddingBottom: spacing.s4 + footerHeight }] : inner
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={contentStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[inner, contentStyle]}>{children}</View>
      )}
      {showFooter && (
        <View
          onLayout={handleFooterLayout}
          style={{
            width: '100%',
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            paddingHorizontal: layout.screenGutter,
            paddingTop: spacing.s3,
            paddingBottom: spacing.s3,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            backgroundColor: colors.bgBase,
          }}
        >
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}
