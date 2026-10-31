type Level = "info" | "warn" | "error";

const secretKeys = ["password", "passwordHash", "authorization", "token", "secret", "card", "cvv", "access_token", "refresh_token"];

function scrub(fields: Record<string, unknown>) {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    copy[key] = secretKeys.some((secret) => key.toLowerCase().includes(secret)) ? "[redacted]" : value;
  }
  return copy;
}

export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...scrub(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
