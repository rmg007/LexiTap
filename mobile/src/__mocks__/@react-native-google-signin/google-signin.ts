// Manual Jest mock so tests never load the native Google Sign-In TurboModule
// (the real package's JS entry calls NativeModule.getConstants() at import
// time, which throws under Jest). Mapped in jest.config.js via
// moduleNameMapper (same pattern as react-native-purchases). Adapter unit
// tests inject their own fake module via the GoogleSignInAdapter deps seam.

export const GoogleSignin = {
  configure: jest.fn(),
  // v16 response-object API: {type:'success',data:User} | {type:'cancelled',data:null}.
  signIn: jest.fn(async () => ({
    type: 'success' as const,
    data: { idToken: 'mock-google-id-token' as string | null },
  })),
  hasPlayServices: jest.fn(async () => true),
  signOut: jest.fn(async () => null),
};

export const statusCodes = Object.freeze({
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  NULL_PRESENTER: 'NULL_PRESENTER',
});
