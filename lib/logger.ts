type LogLevel = "error" | "warn" | "info";

interface LogContext {
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, context: LogContext = {}): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };
  const message = JSON.stringify(entry);
  switch (level) {
    case "error":
      console.error(message);
      break;
    case "warn":
      console.warn(message);
      break;
    case "info":
      console.info(message);
      break;
  }
}

export const logger = {
  error: (event: string, context?: LogContext) => log("error", event, context),
  warn: (event: string, context?: LogContext) => log("warn", event, context),
  info: (event: string, context?: LogContext) => log("info", event, context),
};
