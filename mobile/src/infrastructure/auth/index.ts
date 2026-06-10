// Public surface of the auth infrastructure module.
export { createAuthService } from "@/infrastructure/auth/createAuthService";
export { SupabaseAuthService } from "@/infrastructure/auth/SupabaseAuthService";
export { StubAuthService } from "@/infrastructure/auth/StubAuthService";
export {
  secureStoreAdapter,
  type SecureStorage,
} from "@/infrastructure/auth/secureStoreAdapter";
export {
  AppleSignInAdapter,
  type AppleAuthModule,
} from "@/infrastructure/auth/AppleSignInAdapter";
export {
  GoogleSignInAdapter,
  type GoogleSignInModule,
} from "@/infrastructure/auth/GoogleSignInAdapter";
