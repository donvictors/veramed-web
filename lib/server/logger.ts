import "server-only";

const SENSITIVE_KEY = /pass|secret|token|authorization|cookie|rut|email|phone|address|symptom|health/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(child, depth + 1),
    ]),
  );
}

export function logServerEvent(
  level: "info" | "warn" | "error",
  event: string,
  metadata: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(sanitize(metadata) as Record<string, unknown>),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
