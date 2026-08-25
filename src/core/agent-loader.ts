import { ARCHITECT_PROMPT, CODER_PROMPT, REVIEWER_PROMPT } from "../agents/prompts.js";

export interface AgentDefinition {
  name: string;
  description: string;
  skills: string[];
  systemPrompt: string;
  sourcePath?: string;
}

const agents: AgentDefinition[] = [
  { name: "architect", description: "Creates implementation plans", skills: [], systemPrompt: ARCHITECT_PROMPT },
  { name: "coder", description: "Produces implementation code", skills: [], systemPrompt: CODER_PROMPT },
  { name: "reviewer", description: "Reviews implementation safety and correctness", skills: [], systemPrompt: REVIEWER_PROMPT },
];

export async function loadAgents(): Promise<AgentDefinition[]> {
  return agents.map((agent) => ({ ...agent, skills: [...agent.skills] }));
}
