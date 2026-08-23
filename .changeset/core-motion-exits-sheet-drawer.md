---
"fancy-ui-svelte": minor
---

Sheets and drawers now slide out instead of vanishing, and a drawer flicked past the dismiss threshold carries on from wherever your finger left it rather than snapping back first. Both surfaces run one bidirectional transition, so reopening one mid-exit reverses it instead of stacking; focus returns to the trigger the instant you dismiss rather than when the slide ends, a second Escape during the exit reaches whatever is underneath instead of disappearing into a panel that is already leaving, and the page stays scroll-locked until the backdrop is actually gone. Their exits deliberately travel their full size rather than the half distance the anchored surfaces use — a sheet has to clear its own edge — and the spring-back on a drag released short of the threshold is unchanged. With reduced motion asked for, both close synchronously exactly as they did before.
