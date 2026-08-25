# Clean Architecture

- Organize code around domain use cases, not framework features.
- Keep entities and business rules independent of HTTP, databases, queues, vendors, and MCP.
- Define ports as small interfaces at the boundary; implement adapters outside the domain.
- Depend inward: delivery and infrastructure may depend on application and domain, never the reverse.
- Keep functions focused, names explicit, and duplication removed only when the shared rule is truly the same.
- Pass dependencies in constructors or function arguments; avoid hidden global state.
- Make side effects visible at the edges and keep core transformations deterministic.
- Preserve backward-compatible contracts unless the Task Spec explicitly requires a change.
- Test domain rules without booting infrastructure, then add contract and integration tests at boundaries.
