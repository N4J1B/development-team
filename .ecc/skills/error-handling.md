# Standardized Error Handling

- Use one application error model with a stable `code`, safe `message`, optional `details`, and `retryable` flag.
- Map domain errors to transport responses at the adapter boundary.
- Never catch and silently ignore an error; add context or rethrow it.
- Preserve the original cause for server-side diagnostics without exposing it to clients.
- Treat cancellation, timeout, validation, authorization, conflict, and dependency failures distinctly.
- Use structured logs with correlation IDs and redact sensitive fields.
- Retry only transient, idempotent operations with bounded exponential backoff.
- Return partial results only when the contract explicitly defines their meaning.
- Add tests that assert both the public error shape and the side effects after failure.
