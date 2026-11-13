import "server-only";

// Never log tokens, cookie values, keys, email addresses, or raw SDK errors.
export function logRoleDenial(reason: string, details: { path?: string; role?: string; code?: string } = {}) {
  const code = details.code && /^[A-Z0-9_]{1,32}$/i.test(details.code) ? details.code : undefined;
  console.warn("[SAT Hub roles] Access denied:", reason, { ...details, code });
}
