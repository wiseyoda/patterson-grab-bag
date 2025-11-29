/**
 * Environment variable validation and access
 * Provides type-safe access to environment variables with validation
 */

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Server-side environment variables
 * These should only be accessed in server components or API routes
 */
export const serverEnv = {
  get DATABASE_URL() {
    return getRequiredEnvVar("DATABASE_URL");
  },
  get DIRECT_URL() {
    return getOptionalEnvVar("DIRECT_URL", "");
  },
  get RESEND_API_KEY() {
    return getRequiredEnvVar("RESEND_API_KEY");
  },
} as const;

/**
 * Client-side environment variables
 * These are prefixed with NEXT_PUBLIC_ and safe to use in client components
 */
export const clientEnv = {
  get APP_URL() {
    return getOptionalEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
} as const;

/**
 * Validate all required environment variables at startup
 * Call this in your app initialization
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // Check required server env vars
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  }
  if (!process.env.RESEND_API_KEY) {
    errors.push("RESEND_API_KEY is required");
  }

  if (errors.length > 0) {
    console.error("Environment validation failed:");
    errors.forEach((e) => console.error(`  - ${e}`));
    // Don't throw in production to allow graceful degradation
    if (process.env.NODE_ENV === "development") {
      throw new Error(`Environment validation failed: ${errors.join(", ")}`);
    }
  }
}
