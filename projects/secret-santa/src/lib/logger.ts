interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Format log entry as JSON for structured logging
 * This format works well with Vercel's log aggregation
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    ...(entry.context && { context: entry.context }),
    ...(entry.stack && { stack: entry.stack }),
  });
}

/**
 * Write log entry to console
 * Uses structured JSON format for production (Vercel-friendly)
 * Uses human-readable format for development
 */
function writeLog(entry: LogEntry): void {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // Human-readable format for development
    const lines = [
      `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`,
    ];
    if (entry.context && Object.keys(entry.context).length > 0) {
      lines.push(`  Context: ${JSON.stringify(entry.context)}`);
    }
    if (entry.stack) {
      lines.push(`  Stack: ${entry.stack}`);
    }

    switch (entry.level) {
      case "error":
        console.error(lines.join("\n"));
        break;
      case "warn":
        console.warn(lines.join("\n"));
        break;
      default:
        console.log(lines.join("\n"));
    }
  } else {
    // Structured JSON for production (Vercel logs)
    const formatted = formatLogEntry(entry);
    switch (entry.level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    context,
  };

  if (error instanceof Error) {
    entry.stack = error.stack;
    entry.context = { ...entry.context, errorMessage: error.message };
  } else if (error !== undefined) {
    entry.context = { ...entry.context, error: String(error) };
  }

  writeLog(entry);
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    context,
  };

  writeLog(entry);
}

export function logInfo(
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "info",
    message,
    context,
  };

  writeLog(entry);
}
