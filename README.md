# Tencent EdgeOne Multi-Agent Hub

Serverless Architect -> Coder -> QA workflow for Tencent EdgeOne Makers Edge Functions.
The runtime uses only Web Standard APIs. Prompts are stored in memory and execution history can be written to an
optional `EDGE_KV` binding.

## Configuration

Set `OPENAI_API_KEY` as a protected Edge Function environment variable. The handler also accepts `OPENAI_API_KEY`
or a Bearer token in the request header for gateway integrations.

## API

`POST /` with JSON:

```json
{"requirement":"Build a TypeScript HTTP API for ..."}
```

The response contains `status`, `retries`, `code`, `plan`, and `review`. The Coder and Reviewer stages repeat up to
three times when QA returns anything other than the exact `APPROVED` token.

## Local validation

```bash
npm install
npm run typecheck
npm run build
```

Deploy `src/index.ts` as the EdgeOne Fetch Handler. No local filesystem, Node.js process API, or stdio MCP transport
is required or used by the Edge runtime.
