import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "error.log");

interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

function formatLogEntry(entry: LogEntry): string {
  const lines = [
    `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`,
  ];

  if (entry.context && Object.keys(entry.context).length > 0) {
    lines.push(`  Context: ${JSON.stringify(entry.context)}`);
  }

  if (entry.stack) {
    lines.push(`  Stack: ${entry.stack}`);
  }

  return lines.join("\n") + "\n";
}

function writeToLog(entry: LogEntry): void {
  try {
    const formatted = formatLogEntry(entry);
    fs.appendFileSync(LOG_FILE, formatted);
  } catch (err) {
    // Fallback to console if file write fails
    console.error("Failed to write to log file:", err);
    console.error(entry);
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

  writeToLog(entry);

  // Also log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${message}`, error, context);
  }
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

  writeToLog(entry);

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[WARN] ${message}`, context);
  }
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

  writeToLog(entry);
}
