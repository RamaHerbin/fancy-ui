import { consumerConfig } from "../playwright.shared";

// See ../playwright.shared.ts: the app under test is the scratch copy built by
// scripts/consumers/nuxt.sh, outside the repo, on a free port.
export default consumerConfig((port) => ({
	command: "node .output/server/index.mjs",
	env: { PORT: String(port), HOST: "127.0.0.1" },
}));
