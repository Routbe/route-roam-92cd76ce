// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { nitroTarget, vercelCrons } from "../../scripts/nitro-target";

const vercelJson = JSON.parse(readFileSync("vercel.json", "utf8"));

it("builds the Vercel preset into .vercel/output when Vercel runs the build", () => {
  const target = nitroTarget({ VERCEL: "1" });
  expect(target.preset).toBe("vercel");
  expect("output" in target).toBe(false);
});
it("pins Vercel functions to Node 22, even when Bun drives the build", () => {
  const target = nitroTarget({ NITRO_PRESET: "vercel" });
  expect("vercel" in target && target.vercel.functions.runtime).toBe("nodejs22.x");
});
it("keeps the self-contained dist/ build for own servers", () => {
  expect(nitroTarget({})).toEqual({ preset: "node-server", noExternals: true, output: { dir: "dist" } });
});
it("lets NITRO_PRESET override the Vercel default", () => {
  expect(nitroTarget({ VERCEL: "1", NITRO_PRESET: "node-server" }).preset).toBe("node-server");
});
it("uses the vercel build script and leaves the output directory to the Build Output API", () => {
  expect(vercelJson.buildCommand).toBe("bun run build:vercel");
  expect(vercelJson.framework).toBeNull();
  expect(vercelJson.outputDirectory).toBeUndefined();
});
it("declares no routing or headers in vercel.json, because .vercel/output/config.json owns them", () => {
  for (const key of ["rewrites", "routes", "redirects", "headers", "cleanUrls", "trailingSlash"]) {
    expect(vercelJson[key], key).toBeUndefined();
  }
});
it("copies every vercel.json cron into the generated config, each backed by a route file", () => {
  const crons = vercelCrons(vercelJson);
  expect(crons).toEqual(vercelJson.crons);
  const target = nitroTarget({ VERCEL: "1" }, crons);
  expect("vercel" in target && target.vercel.config.crons).toEqual(crons);
  for (const { path } of crons) {
    const file = `src/routes/${path.slice(1).replace("api/public/", "api_.public.").replaceAll("/", ".")}.ts`;
    expect(existsSync(file), file).toBe(true);
  }
});
