import { loadAgents } from "./core/agent-loader.js";
import { Orchestrator } from "./core/orchestrator.js";

const agents = await loadAgents();
console.log(`Loaded ${agents.length} agent definitions: ${agents.map((agent) => agent.name).join(", ")}`);
console.log("Create an AgentModel implementation and pass it to Orchestrator.run(request) to execute a workflow.");

export { loadAgents, Orchestrator };
