import os from "node:os";
import path from "node:path";
import { setupGlobal } from "sv/testing";

// Outside the repo, so nothing the projects resolve can fall back to the monorepo's
// node_modules (and no generated app lands in the git tree). SV_TEST_DIR overrides it.
const TEST_DIR = process.env.SV_TEST_DIR ?? path.join(os.tmpdir(), "fancy-ui-sv-sdk");

export default setupGlobal({ TEST_DIR });
