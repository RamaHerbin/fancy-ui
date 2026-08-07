---
"fancy-ui-svelte": minor
---

Add the knowledge surfaces of the AI/chat family: the `Sources` compound (`Sources`, `SourcesTrigger`, `SourcesList`, `SourceCard`, plus the exported `SOURCES_CONTEXT_KEY`/`SourcesContext` contract) rendering an answer's citations as a monogram-stack pill that expands into scannable source cards; `InlineCitation` (a numbered in-sentence reference revealing a `SourceCard` preview in a floating card on hover or focus, tooltip-pattern accessible); `WebSearch` (a search the agent ran — query header, indeterminate scanning bar, results landing row by row without re-keying settled entries); and `ImageGeneration` (a fixed-aspect frame that holds layout while a model draws — pixel-grid generating state, blur-to-sharp reveal that can never strand a server-rendered image blurred, and an error state with retry). Shared host/monogram helpers land in the internals layer used across the three citation-bearing components.
