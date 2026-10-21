import { consumerConfig } from "../playwright.shared";

// See ../playwright.shared.ts: the app under test is the scratch copy built by
// scripts/consumers/next.sh, outside the repo, on a free port.
export default consumerConfig((port) => ({ command: `npx next start -p ${port} -H 127.0.0.1` }));
