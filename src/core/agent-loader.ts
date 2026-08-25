import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface AgentDefinition {
  name: string;
  description: string;
  skills: string[];
  systemPrompt: string;
  sourcePath: string;
}

function parseFrontmatter(markdown: string): { metadata: Record<string, string | string[]>; body: string } {
  if (!markdown.startsWith("---\n")) return { metadata: {}, body: markdown };
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return { metadata: {}, body: markdown };

  const metadata: Record<string, string | string[]> = {};
  for (const line of markdown.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      metadata[key] = rawValue.slice(1, -1).split(",").map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""));
    } else {
      metadata[key] = rawValue.replace(/^['\"]|['\"]$/g, "");
    }
  }
  return { metadata, body: markdown.slice(end + 4).trim() };
}

function readString(metadata: Record<string, string | string[]>, key: string, fallback: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value : fallback;
}

export async function loadAgents(projectRoot = process.cwd()): Promise<AgentDefinition[]> {
  const agentsDirectory = resolve(projectRoot, ".ecc", "agents");
  const skillsDirectory = resolve(projectRoot, ".ecc", "skills");
  const entries = await readFileNames(agentsDirectory);
  const skillCache = new Map<string, string>();

  return Promise.all(entries.filter((name) => name.endsWith(".md")).sort().map(async (name) => {
    const sourcePath = resolve(agentsDirectory, name);
    const parsed = parseFrontmatter(await readFile(sourcePath, "utf8"));
    const configuredSkills = parsed.metadata.skills;
    const skills = Array.isArray(configuredSkills) ? configuredSkills : [];
    const skillText = await Promise.all(skills.map(async (skill) => {
      if (!skillCache.has(skill)) skillCache.set(skill, await readFile(resolve(skillsDirectory, `${skill}.md`), "utf8"));
      return skillCache.get(skill) as string;
    }));
    return {
      name: readString(parsed.metadata, "name", name.replace(/\.md$/, "")),
      description: readString(parsed.metadata, "description", ""),
      skills,
      systemPrompt: [parsed.body, ...skillText.map((text, index) => `\n## Injected Skill: ${skills[index]}\n${text}`)].join("\n"),
      sourcePath,
    };
  }));
}

async function readFileNames(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory);
}
