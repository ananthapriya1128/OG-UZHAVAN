/** Retry transient network failures without blocking the UI indefinitely. */
export async function retryWithBackoff(operation, { retries = 3, baseDelayMs = 400, maxDelayMs = 5000, shouldRetry = () => true } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function isTransientFirebaseError(error) {
  return ["unavailable", "deadline-exceeded", "resource-exhausted", "network-request-failed"].some((code) => error?.code?.includes(code));
}
