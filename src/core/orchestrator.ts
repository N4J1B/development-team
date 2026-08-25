import { PROMPTS } from "../prompts.js";
import { cleanCodeOutput } from "../utils/cleaner.js";

const MAX_RETRIES = 3;
const DEFAULT_MODEL_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export interface EdgeWorkflowResult {
  status: "APPROVED" | "CHANGES_REQUESTED";
  retries: number;
  code: string;
  plan: unknown;
  review: string;
  conversationId?: string;
}

export interface EdgeModelConfig {
  apiKey: string;
  modelUrl?: string;
  model?: string;
  conversationId?: string;
  history?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

async function askAgent(config: EdgeModelConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(config.modelUrl ?? DEFAULT_MODEL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model ?? DEFAULT_MODEL, temperature: 0, messages: [
      { role: "system", content: systemPrompt },
      ...(config.history ? [{ role: "system" as const, content: `Conversation context:\n${config.history}` }] : []),
      { role: "user", content: userPrompt },
    ] }),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model returned an empty response");
  return content;
}

function parsePlan(rawPlan: string): unknown {
  const cleaned = rawPlan.replace(/^\s*```(?:json)?\s*\r?\n/i, "").replace(/\r?\n?\s*```\s*$/i, "").trim();
  try { return JSON.parse(cleaned) as unknown; } catch { throw new Error("Architect returned invalid JSON"); }
}

export async function runEdgeMultiAgent(userRequirement: string, apiKey: string, options: Omit<EdgeModelConfig, "apiKey"> = {}): Promise<EdgeWorkflowResult> {
  if (!userRequirement.trim()) throw new Error("Requirement must not be empty");
  if (!apiKey.trim()) throw new Error("API key must not be empty");
  const config = { ...options, apiKey };
  const plan = parsePlan(await askAgent(config, PROMPTS.architect, userRequirement));
  let code = cleanCodeOutput(await askAgent(config, PROMPTS.coder, JSON.stringify({ requirement: userRequirement, plan })));
  let review = await askAgent(config, PROMPTS.reviewer, JSON.stringify({ requirement: userRequirement, plan, code }));
  let retries = 0;
  while (!/^\s*APPROVED\s*$/i.test(review.trim()) && retries < MAX_RETRIES) {
    retries += 1;
    code = cleanCodeOutput(await askAgent(config, PROMPTS.coder, JSON.stringify({ requirement: userRequirement, plan, previousCode: code, reviewerFeedback: review })));
    review = await askAgent(config, PROMPTS.reviewer, JSON.stringify({ requirement: userRequirement, plan, code }));
  }
  return { status: /^\s*APPROVED\s*$/i.test(review.trim()) ? "APPROVED" : "CHANGES_REQUESTED", retries, code, plan, review, conversationId: options.conversationId };
}
