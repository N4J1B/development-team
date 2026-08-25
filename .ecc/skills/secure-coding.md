# Secure Coding Checklist

Before requesting review, verify:

- [ ] Every external input is validated, normalized, bounded, and rejected with a safe error.
- [ ] Authentication and authorization are checked server-side for every protected operation.
- [ ] SQL, shell, template, path, and command arguments are parameterized or safely allowlisted.
- [ ] User-controlled paths cannot escape the intended directory; symlinks and traversal are considered.
- [ ] Output encoding and HTML sanitization prevent XSS; CSRF protections match the auth model.
- [ ] SSRF and arbitrary URL redirects are blocked with scheme, host, and network-range rules.
- [ ] Secrets, credentials, tokens, personal data, and stack traces are absent from logs and responses.
- [ ] Cryptography uses maintained standard libraries, safe algorithms, and correct key handling.
- [ ] Timeouts, request-size limits, rate limits, and resource bounds prevent abuse and denial of service.
- [ ] Dependencies are pinned or lockfile-controlled and checked for known vulnerabilities.
- [ ] Errors fail closed and expose stable public codes rather than internal implementation details.
- [ ] Tests cover authorization failures, malformed input, boundary values, and security regressions.
