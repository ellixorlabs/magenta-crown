type OpsLevel = "info" | "warn" | "error";

/**
 * Structured ops log (JSON line). Swap sink later (OpenTelemetry, Datadog, etc.).
 */
export function opsLog(scope: string, level: OpsLevel, message: string, meta?: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), scope, level, message, ...meta };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
