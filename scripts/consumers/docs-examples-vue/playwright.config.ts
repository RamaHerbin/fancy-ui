import { consumerConfig } from "../../../examples/consumers/playwright.shared";

// The harness runs on a dev server on purpose: Vue only reports prop, slot and
// hydration warnings in development. CONSUMER_APP_DIR / CONSUMER_PORT come from
// docs-examples-vue.mjs.
export default consumerConfig((port) => ({
	command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`,
}));
