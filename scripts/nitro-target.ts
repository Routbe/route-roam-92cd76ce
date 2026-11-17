// Pure Nitro target selection, shared by vite.config.ts and its test.
// Own server (default): self-contained dist/. Vercel: Nitro writes the Build
// Output API v3 tree to .vercel/output, which Vercel deploys as-is.
export type VercelCron = { path: string; schedule: string };

export function nitroTarget(env: Record<string, string | undefined>, crons: VercelCron[] = []) {
  const preset = env["NITRO_PRESET"]?.trim() || (env["VERCEL"] ? "vercel" : "node-server");
  const base = { preset, noExternals: true } as const;
  if (preset !== "vercel") return { ...base, output: { dir: "dist" } };
  // No output override: the preset's .vercel/output is the only place Vercel looks.
  // Node runtime is pinned so a Bun-driven build never switches functions to Bun.
  return { ...base, vercel: { functions: { runtime: "nodejs22.x" }, config: { crons } } };
}

/** Crons are declared once in vercel.json and copied into .vercel/output/config.json. */
export function vercelCrons(vercelJson: unknown): VercelCron[] {
  const crons = (vercelJson as { crons?: unknown })?.crons;
  if (!Array.isArray(crons)) return [];
  return crons.filter((c): c is VercelCron => typeof c?.path === "string" && typeof c?.schedule === "string")
    .map(({ path, schedule }) => ({ path, schedule }));
}
