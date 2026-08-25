import { ARCHITECT_PROMPT, CODER_PROMPT, REVIEWER_PROMPT } from "../agents/prompts.js";
import { cleanCodeOutput } from "../utils/cleaner.js";

const MAX_RETRIES = 3;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface EdgeWorkflowResult {
  status: "APPROVED" | "CHANGES_REQUESTED";
  retries: number;
  code: string;
  plan: unknown;
  review: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

async function askAgent(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, messages: [
      { role: "system", content: systemPrompt }, { role: "user", content: userPrompt },
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

export async function runEdgeMultiAgent(userRequirement: string, apiKey: string): Promise<EdgeWorkflowResult> {
  if (!userRequirement.trim()) throw new Error("Requirement must not be empty");
  if (!apiKey.trim()) throw new Error("API key must not be empty");
  const plan = parsePlan(await askAgent(apiKey, ARCHITECT_PROMPT, userRequirement));
  let code = cleanCodeOutput(await askAgent(apiKey, CODER_PROMPT, JSON.stringify({ requirement: userRequirement, plan })));
  let review = await askAgent(apiKey, REVIEWER_PROMPT, JSON.stringify({ requirement: userRequirement, plan, code }));
  let retries = 0;
  while (!/^\s*APPROVED\s*$/i.test(review.trim()) && retries < MAX_RETRIES) {
    retries += 1;
    code = cleanCodeOutput(await askAgent(apiKey, CODER_PROMPT, JSON.stringify({ requirement: userRequirement, plan, previousCode: code, reviewerFeedback: review })));
    review = await askAgent(apiKey, REVIEWER_PROMPT, JSON.stringify({ requirement: userRequirement, plan, code }));
  }
  return { status: /^\s*APPROVED\s*$/i.test(review.trim()) ? "APPROVED" : "CHANGES_REQUESTED", retries, code, plan, review };
}
