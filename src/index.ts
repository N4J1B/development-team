import { runEdgeMultiAgent, type EdgeWorkflowResult } from "./core/orchestrator.js";

export interface EdgeEnvironment {
	OPENAI_API_KEY?: string;
	EDGE_KV?: { put(key: string, value: string, options?: unknown): Promise<void> };
}

interface RequirementPayload { requirement?: unknown; }

const corsHeaders = {
	"Access-Control-Allow-Headers": "Content-Type, Authorization, OPENAI_API_KEY",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
	});
}

export default {
	async fetch(request: Request, env: EdgeEnvironment): Promise<Response> {
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
		if (request.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, 405);

		try {
			const payload = (await request.json()) as RequirementPayload;
			if (typeof payload.requirement !== "string" || !payload.requirement.trim()) {
				return jsonResponse({ error: "Field 'requirement' must be a non-empty string" }, 400);
			}
			const apiKey = env.OPENAI_API_KEY
				?? request.headers.get("OPENAI_API_KEY")
				?? request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
			if (!apiKey) return jsonResponse({ error: "Missing OPENAI_API_KEY" }, 500);
			const result: EdgeWorkflowResult = await runEdgeMultiAgent(payload.requirement, apiKey);
			if (env.EDGE_KV) await env.EDGE_KV.put(`workflow:${crypto.randomUUID()}`, JSON.stringify(result));
			return jsonResponse(result, result.status === "APPROVED" ? 200 : 422);
		} catch (error) {
			return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
		}
	},
};

export { runEdgeMultiAgent };
