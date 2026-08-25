import type { AgentDefinition } from "./agent-loader.js";
import { McpToolClient } from "../mcp/client.js";

export interface AgentModel {
  complete(input: { systemPrompt: string; userPrompt: string; mcp?: McpToolClient }): Promise<string>;
}

export interface WorkflowRequest {
  prompt: string;
  context?: string;
}

export interface TaskPlan {
  summary: string;
  tasks: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface QaReview {
  status: "APPROVED" | "CHANGES_REQUESTED";
  decision: "approved" | "changes_requested";
  findings: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface WorkflowResult {
  plan: TaskPlan;
  codeReport: string;
  review: QaReview;
  attempts: number;
}

export interface OrchestratorOptions {
  agents: AgentDefinition[];
  model: AgentModel;
  mcp?: McpToolClient;
  maxRetries?: number;
}

export class Orchestrator {
  private readonly agentsByName: Map<string, AgentDefinition>;
  private readonly maxRetries: number;

  constructor(private readonly options: OrchestratorOptions) {
    this.agentsByName = new Map(options.agents.map((agent) => [agent.name, agent]));
    this.maxRetries = Math.max(0, Math.min(options.maxRetries ?? 3, 3));
  }

  async run(request: WorkflowRequest): Promise<WorkflowResult> {
    const architect = this.requireAgent("architect");
    const coder = this.requireAgent("backend-coder", "frontend-coder");
    const reviewer = this.requireAgent("qa-reviewer");

    const plan = parseJson<TaskPlan>(await this.complete(architect, request.prompt), "Architect plan");
    let codeReport = await this.complete(coder, this.codePrompt(request, plan));
    let review = parseQaReview(await this.complete(reviewer, this.reviewPrompt(request, plan, codeReport)));
    let attempts = 1;

    while (review.status !== "APPROVED" && attempts <= this.maxRetries) {
      codeReport = await this.complete(coder, this.patchPrompt(request, plan, codeReport, review));
      review = parseQaReview(await this.complete(reviewer, this.reviewPrompt(request, plan, codeReport)));
      attempts += 1;
    }

    return { plan, codeReport, review, attempts };
  }

  private async complete(agent: AgentDefinition, userPrompt: string): Promise<string> {
    let mcpContext = "";
    if (this.options.mcp) {
      const tools = await this.options.mcp.listTools();
      mcpContext = `\nAvailable MCP tools (call only when needed):\n${JSON.stringify(tools.tools)}`;
    }
    return this.options.model.complete({ systemPrompt: `${agent.systemPrompt}${mcpContext}`, userPrompt, mcp: this.options.mcp });
  }

  private requireAgent(...names: string[]): AgentDefinition {
    const agent = names.map((name) => this.agentsByName.get(name)).find(Boolean);
    if (!agent) throw new Error(`Required agent not loaded: ${names.join(" or ")}`);
    return agent;
  }

  private codePrompt(request: WorkflowRequest, plan: TaskPlan): string {
    return `Implement this user request according to the Architect plan.\n\nRequest:\n${request.prompt}\n\nAdditional context:\n${request.context ?? "none"}\n\nPlan:\n${JSON.stringify(plan, null, 2)}`;
  }

  private reviewPrompt(request: WorkflowRequest, plan: TaskPlan, codeReport: string): string {
    return `Review the implementation for this request. Return JSON with status exactly APPROVED or CHANGES_REQUESTED.\n\nRequest:\n${request.prompt}\n\nPlan:\n${JSON.stringify(plan, null, 2)}\n\nCoder report and available implementation state:\n${codeReport}`;
  }

  private patchPrompt(request: WorkflowRequest, plan: TaskPlan, codeReport: string, review: QaReview): string {
    return `Patch the implementation based on the QA findings. Preserve passing behavior and acceptance criteria.\n\nRequest:\n${request.prompt}\n\nPlan:\n${JSON.stringify(plan, null, 2)}\n\nPrevious coder report:\n${codeReport}\n\nQA findings:\n${JSON.stringify(review, null, 2)}`;
  }
}

function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${label} must be valid JSON`, { cause: error });
  }
}

function parseQaReview(text: string): QaReview {
  const review = parseJson<Partial<QaReview>>(text, "QA review");
  const status = review.status ?? (review.decision === "approved" ? "APPROVED" : "CHANGES_REQUESTED");
  if (status !== "APPROVED" && status !== "CHANGES_REQUESTED") {
    throw new Error("QA review status must be APPROVED or CHANGES_REQUESTED");
  }
  return {
    ...review,
    status,
    decision: status === "APPROVED" ? "approved" : "changes_requested",
    findings: review.findings ?? [],
  };
}
