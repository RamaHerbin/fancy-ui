import { consumerConfig } from "../playwright.shared";

// See ../playwright.shared.ts: the app under test is the scratch copy built by
// scripts/consumers/astro.sh, outside the repo. `astro preview` serves the
// static build (no dev server). `--ignore-lock` keeps it in the foreground:
// Astro 7 moves preview to a background daemon when it detects a coding agent
// in the environment, and Playwright would then see its server exit.
export default consumerConfig((port) => ({
	command: `npx astro preview --host 127.0.0.1 --port ${port} --ignore-lock`,
}));
