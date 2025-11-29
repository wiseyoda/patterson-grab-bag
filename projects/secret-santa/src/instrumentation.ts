import { validateEnv } from "@/lib/env";

export function register() {
  // Validate environment variables on server startup
  validateEnv();
}
