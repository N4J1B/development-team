/** Removes an optional Markdown code fence while preserving the program text. */
export function cleanCodeOutput(rawText: string): string {
  return rawText
    .replace(/^\s*```(?:typescript|ts|javascript|js)?\s*\r?\n/i, "")
    .replace(/\r?\n?\s*```\s*$/i, "")
    .trim();
}