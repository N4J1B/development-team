import { runEdgeMultiAgent, type EdgeWorkflowResult } from "./core/orchestrator.js";

export interface EdgeEnvironment {
	OPENAI_API_KEY?: string;
	ALLOW_REQUEST_API_KEY?: string;
	MODEL_GATEWAY_URL?: string;
	MODEL_NAME?: string;
	AGENT_AUTH_TOKEN?: string;
	EDGE_KV?: {
		get(key: string): Promise<string | null>;
		put(key: string, value: string, options?: unknown): Promise<void>;
	};
}

interface RequirementPayload { requirement?: unknown; conversationId?: unknown; }

const MAX_REQUIREMENT_LENGTH = 32_000;

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
			if (env.AGENT_AUTH_TOKEN) {
				const suppliedToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
				if (suppliedToken !== env.AGENT_AUTH_TOKEN) return jsonResponse({ error: "Unauthorized" }, 401);
			}
			const payload = (await request.json()) as RequirementPayload;
			if (typeof payload.requirement !== "string" || !payload.requirement.trim()) {
				return jsonResponse({ error: "Field 'requirement' must be a non-empty string" }, 400);
			}
			if (payload.requirement.length > MAX_REQUIREMENT_LENGTH) {
				return jsonResponse({ error: `Field 'requirement' exceeds ${MAX_REQUIREMENT_LENGTH} characters` }, 413);
			}
			if (payload.conversationId !== undefined && (typeof payload.conversationId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(payload.conversationId))) {
				return jsonResponse({ error: "Field 'conversationId' is invalid" }, 400);
			}
			const apiKey = env.OPENAI_API_KEY
				?? (env.ALLOW_REQUEST_API_KEY === "true" ? request.headers.get("OPENAI_API_KEY") : undefined);
			if (!apiKey) return jsonResponse({ error: "Missing OPENAI_API_KEY" }, 500);
			const conversationId = payload.conversationId as string | undefined;
			let history: string | null = null;
			if (conversationId && env.EDGE_KV) {
				try {
					history = await env.EDGE_KV.get(`conversation:${conversationId}`);
				} catch {
					history = null;
				}
			}
			const result: EdgeWorkflowResult = await runEdgeMultiAgent(payload.requirement, apiKey, {
				conversationId,
				history: history ?? undefined,
				model: env.MODEL_NAME,
				modelUrl: env.MODEL_GATEWAY_URL,
			});
			if (env.EDGE_KV) {
				const key = conversationId ?? crypto.randomUUID();
				try {
					await env.EDGE_KV.put(`conversation:${key}`, JSON.stringify({ requirement: payload.requirement, result }));
				} catch { }
			}
			return jsonResponse(result, result.status === "APPROVED" ? 200 : 422);
		} catch (error) {
			return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
		}
	},
};

export { runEdgeMultiAgent };
