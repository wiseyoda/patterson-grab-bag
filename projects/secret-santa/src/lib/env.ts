function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getDatabaseUrl(): string {
  return (
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
  get DATABASE_URL() {
    const url = getDatabaseUrl();
    if (!url) {
      throw new Error("Missing required environment variable: DATABASE_URL (or POSTGRES_PRISMA_URL/POSTGRES_URL)");
    }
    return url;
  },
  get DIRECT_URL() {
    return getDirectUrl();
  },
  get RESEND_API_KEY() {
    return getOptionalEnvVar("RESEND_API_KEY", "");
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
    errors.push("DATABASE_URL (or POSTGRES_PRISMA_URL/POSTGRES_URL) is required");
  }

  if (!getDirectUrl()) {
    warnings.push("DIRECT_URL (or POSTGRES_URL_NON_POOLING/POSTGRES_PRISMA_URL_NON_POOLING) is recommended for Prisma migrations");
  }

  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY is missing; email sending will be disabled");
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
