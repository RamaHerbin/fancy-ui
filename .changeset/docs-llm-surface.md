---
"fancy-ui-svelte": patch
---

Docs: a machine-readable surface for LLMs and agents. Every component now has a Markdown page at `/docs/components/<slug>.md` (import, props, snippets and every docs example with package imports), linked from `/llms.txt` and from each docs page (`rel="alternate"` plus a "Copy as Markdown" button). `/llms-full.txt` inlines one short working example per component and a React import line when the component is ported. The new `/registry.json` exposes the same facts as JSON. Both files describe the React edition (`fancy-ui-react`). Docs pages now show the names the package really exports (card-3d imports `CardContainer`, `CardBody`, `CardItem`), render an Events table when a component declares events, and carry richer structured data.
