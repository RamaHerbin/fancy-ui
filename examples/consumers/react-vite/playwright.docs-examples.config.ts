import { consumerConfig, vitePreview } from "../playwright.shared";

// Run by scripts/consumers/docs-examples-react.mjs, never by react-vite.sh:
// the app under test is the scratch copy whose entry mounts every docs example.
export default { ...consumerConfig(vitePreview), testDir: "./docs-examples-tests" };
