import { consumerConfig, vitePreview } from "../playwright.shared";

// See ../playwright.shared.ts: the app under test is one of the SvelteKit apps that
// scripts/consumers/sv-addon.sh created with `sv create` and set up with `sv add`, outside the repo.
export default consumerConfig(vitePreview);
