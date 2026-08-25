import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface McpClientOptions {
  command: string;
  args?: string[];
  name?: string;
  version?: string;
}

export class McpToolClient {
  private readonly client: Client;
  private transport?: StdioClientTransport;

  constructor(private readonly options: McpClientOptions) {
    this.client = new Client({ name: options.name ?? "ecc-orchestrator", version: options.version ?? "0.1.0" });
  }

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({ command: this.options.command, args: this.options.args ?? [] });
    await this.client.connect(this.transport);
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
    return this.client.callTool({ name, arguments: args });
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
