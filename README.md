# ECC Multi-Agent Orchestrator

Modular TypeScript/Node.js workflow for Architect -> Coder -> QA, with an optional MCP stdio client.

## Setup

```bash
npm install
npm run typecheck
npm run build
npm start
```

Node.js 20 or newer is required. Agent prompts and skill rules live in `.ecc/` and are loaded at runtime from the current project root.

## Integrating a model

Implement `AgentModel.complete()` in your application boundary and pass it to `new Orchestrator({ agents, model })`. The orchestrator does not embed an LLM SDK, so an HTTP model gateway, a local model, a serverless handler, or a test double can be used without changing the workflow.

```ts
const result = await new Orchestrator({ agents, model }).run({ prompt: userRequest });
```

Architect and QA responses must be JSON matching their prompt schemas. QA findings cause a coder/reviewer loop with at most three patch retries.

## MCP

`McpToolClient` uses `@modelcontextprotocol/sdk` over stdio. Connect it to a trusted MCP server, pass it as `mcp` to the orchestrator, and close it when the request lifecycle ends. The included `.vscode/mcp.json` demonstrates a filesystem server. Treat filesystem and terminal tools as privileged capabilities: use an allowlisted workspace, least privilege, timeouts, and explicit authorization before exposing them to agents.

The core workflow is stateless between calls. For serverless or edge deployments, create the model and MCP transport per invocation, or use an HTTP-compatible MCP transport supplied by the SDK/runtime rather than relying on process-global state.
