---
"fancy-ui-react": minor
---

First published release of fancy-ui-react. The package joins the repo's pnpm
workspace, so Changesets discovers and publishes it through the existing
release pipeline. The build now preserves module boundaries (one dist file per
source module) so consumers tree-shake unused components, and every built
module carries the `"use client"` directive for React Server Component apps.
