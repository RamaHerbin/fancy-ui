---
---

CI only: the design and motion audit instruments move into `scripts/audit/` (static census, reduced-motion check, micro-interaction capture, perf and axe sweeps, contact sheets, record merge and matrix generator, each with `--self-test` and a `node:test` suite), and a new `check:motion-tokens` gate fails when a `var(--ft-*)` fallback differs from `tokens.ts` or when the count of bare or uncommented off-token motion literals rises above its pin.
