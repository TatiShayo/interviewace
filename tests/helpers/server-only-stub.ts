// Vitest stub for the `server-only` package. The real package throws when
// imported outside a React Server Component bundle; under Node/vitest we alias
// it to this no-op so server modules (prompts, ai gateway) can be unit-tested.
export {};
