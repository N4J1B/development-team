import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadAgents } from "./core/agent-loader.js";
import { Orchestrator, type AgentModel, type WorkflowResult } from "./core/orchestrator.js";

export const MAX_RETRIES = 3;

/** Removes Markdown fences so the result can be written as a source file. */
export function cleanCodeOutput(rawText: string): string {
	return rawText
		.replace(/^\s*```(?:[a-zA-Z0-9_+-]+)?\s*\r?\n?/i, "")
		.replace(/\r?\n?\s*```\s*$/i, "")
		.trim();
}

export async function runWorkflow(model: AgentModel, prompt: string): Promise<WorkflowResult> {
	const agents = await loadAgents();
	const orchestrator = new Orchestrator({ agents, model, maxRetries: MAX_RETRIES });
	const result = await orchestrator.run({ prompt });
	const finalCode = cleanCodeOutput(result.codeReport);
	const outputDirectory = resolve(process.cwd(), "output");

	await mkdir(outputDirectory, { recursive: true });
	await writeFile(resolve(outputDirectory, "result.ts"), `${finalCode}\n`, "utf8");

	if (result.review.status === "APPROVED") {
		console.log(`QA APPROVED. Final code saved to ${resolve(outputDirectory, "result.ts")}`);
	} else {
		console.warn(`QA did not approve after ${result.attempts} attempt(s). Final code saved for inspection.`);
	}

	return result;
}

export { loadAgents, Orchestrator };
