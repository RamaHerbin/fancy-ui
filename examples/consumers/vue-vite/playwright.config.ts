import { consumerConfig, vitePreview } from "../playwright.shared";

// See ../playwright.shared.ts: the app under test is the scratch copy built by
// scripts/consumers/vue-vite.sh, outside the repo.
export default consumerConfig(vitePreview);
