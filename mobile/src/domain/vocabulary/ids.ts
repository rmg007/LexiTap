// Branded ID types prevent accidentally passing a TierId where a WordId is
// expected. The brand exists only at the type level; at runtime these are
// plain strings/numbers (see DATA_MODELS.md "Conventions").

export type WordId = string & { readonly __brand: 'WordId' };
export type TierId = string & { readonly __brand: 'TierId' };
export type SessionId = number & { readonly __brand: 'SessionId' };

export function asWordId(value: string): WordId {
  return value as WordId;
}

export function asTierId(value: string): TierId {
  return value as TierId;
}

export function asSessionId(value: number): SessionId {
  return value as SessionId;
}
