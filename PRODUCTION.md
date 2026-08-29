# Production hardening

## What is implemented

- Booking requests have a client-generated idempotency key. The deployed `createBooking` Cloud Function stores the first result for 24 hours, so a retry returns the same booking instead of creating a duplicate.
- The function allocates a token inside a Firestore transaction and rate-limits each signed-in user to eight booking requests per minute.
- The client retries transient callable-function failures with bounded exponential backoff.
- Function failures are written to Cloud Logging. Set `FUNCTION_ALERT_WEBHOOK` to receive a concise alert in Slack or another webhook receiver.

## Deployment requirements

1. Configure Firebase Authentication and require signed-in farmers before enabling production bookings.
2. Install dependencies in `functions/` and deploy the `createBooking` function in `asia-south1`.
3. Enable Firebase App Check before enforcing App Check in production.
4. Configure a secret or environment variable for `FUNCTION_ALERT_WEBHOOK`; never place it in the browser bundle.
5. Set a Firestore TTL policy for `idempotency.expiresAt`.

No sensitive Aadhaar, OTP, or bank data is logged by the function.
