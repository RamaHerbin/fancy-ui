---
---

Repo-level: introduces the standalone `react/` package (`fancy-ui-react`) —
first slice of the dual-framework effort. No change to `fancy-ui-svelte`
itself, hence the empty bump.

The empty frontmatter is also the honest state of the release path: `react/`
is a separate install root, so `changeset publish` at the repo root never
discovers it and this package does not reach npm through the existing
pipeline. Nothing here is publishable yet by design — the README says so, and
building that path (a dedicated publish job, a react-local Changesets setup,
or folding `react/` into a root workspace) is tracked as its own piece of
work.
