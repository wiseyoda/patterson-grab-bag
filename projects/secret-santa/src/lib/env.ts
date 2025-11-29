function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getDatabaseUrl(): string {
  return (
    process.env.PRISMA_DATABASE_URL ||
    process.env.PRISMA_ACCELERATE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function getDirectUrl(): string {
  return (
    process.env.DIRECT_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL_NON_POOLING ||
    ""
  );
}

/**
 * Server-side environment variables
 * These should only be accessed in server components or API routes
 */
export const serverEnv = {
  get PRISMA_DATABASE_URL() {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error("Missing required environment variable: PRISMA_DATABASE_URL (or PRISMA_ACCELERATE_URL/POSTGRES_PRISMA_URL/POSTGRES_URL)");
    }
    return url;
  },
  get DIRECT_URL() {
    return getDirectUrl();
  },
  get GOOGLE_CLIENT_ID() {
    return getRequiredEnvVar("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return getRequiredEnvVar("GOOGLE_CLIENT_SECRET");
  },
  get GOOGLE_REDIRECT_URI() {
    return getRequiredEnvVar("GOOGLE_REDIRECT_URI");
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
  const warnings: string[] = [];

  // Check required server env vars
  if (!getDatabaseUrl()) {
    errors.push("PRISMA_DATABASE_URL (or PRISMA_ACCELERATE_URL/POSTGRES_PRISMA_URL/POSTGRES_URL) is required");
  }

  if (!getDirectUrl()) {
    warnings.push("DIRECT_URL (or POSTGRES_URL_NON_POOLING/POSTGRES_PRISMA_URL_NON_POOLING) is recommended for Prisma migrations");
  }

  // Check Google OAuth env vars (required for Gmail integration)
  if (!process.env.GOOGLE_CLIENT_ID) {
    warnings.push("GOOGLE_CLIENT_ID is required for Gmail integration");
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push("GOOGLE_CLIENT_SECRET is required for Gmail integration");
  }
  if (!process.env.GOOGLE_REDIRECT_URI) {
    warnings.push("GOOGLE_REDIRECT_URI is required for Gmail integration");
  }
  if (!process.env.OAUTH_TOKEN_ENCRYPTION_KEY) {
    warnings.push("OAUTH_TOKEN_ENCRYPTION_KEY is required for Gmail integration");
  }

  if (errors.length > 0) {
    console.error("Environment validation failed:");
    errors.forEach((e) => console.error(`  - ${e}`));
    // Don't throw in production to allow graceful degradation
    if (process.env.NODE_ENV === "development") {
      throw new Error(`Environment validation failed: ${errors.join(", ")}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("Environment warnings:");
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }
}
