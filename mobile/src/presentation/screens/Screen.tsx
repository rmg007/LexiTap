import React, { type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/presentation/theme';

// Screen scaffold: safe-area + base background + gutter + content max-width cap
// (600 for tablets, DESIGN_SYSTEM.md). Scrollable by default.

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, contentStyle }: ScreenProps): React.JSX.Element {
  const { colors, spacing, layout } = useTheme();
  const inner: ViewStyle = {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.s4,
    gap: spacing.s4,
    flexGrow: 1,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
          <View style={contentStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
