// Manual Jest mock so tests never load the native ExpoAppleAuthentication
// module. Mapped in jest.config.js via moduleNameMapper (same pattern as
// react-native-purchases). Adapter unit tests inject their own fake module via
// the AppleSignInAdapter deps seam; this mock exists so importing the module
// (adapter default path, SignInScreen button) is safe under Jest.

import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

export const isAvailableAsync = jest.fn(async (): Promise<boolean> => false);

export const signInAsync = jest.fn(async () => ({
  identityToken: 'mock-apple-identity-token' as string | null,
}));

export enum AppleAuthenticationScope {
  FULL_NAME = 0,
  EMAIL = 1,
}

export enum AppleAuthenticationButtonType {
  SIGN_IN = 0,
  CONTINUE = 1,
  SIGN_UP = 2,
}

export enum AppleAuthenticationButtonStyle {
  WHITE = 0,
  WHITE_OUTLINE = 1,
  BLACK = 2,
}

// Render a plain Pressable so render tests can find + press the button via the
// testID / accessibilityLabel that SignInScreen passes through.
export function AppleAuthenticationButton(
  props: PressableProps & {
    buttonType?: number;
    buttonStyle?: number;
    cornerRadius?: number;
  },
): React.JSX.Element {
  // Strip the Apple-only props so the host Pressable doesn't receive them.
  const { buttonType, buttonStyle, cornerRadius, ...rest } = props;
  void buttonType;
  void buttonStyle;
  void cornerRadius;
  return <Pressable accessibilityRole="button" {...rest} />;
}
