---
"fancy-ui-react": minor
---

Add FollowButton: a follow toggle that flips at once, then commits when `onToggle` resolves or rolls back, shows the error and announces it when it rejects (a second click retries). `following` is fully controlled when passed: it is the committed value, `onFollowingChange` reports an accepted attempt without writing it, and a parent that refuses the change keeps the button on the prop. Without it the button keeps its own value (`defaultFollowing`). A parent change during a pending attempt wins. The accessible name stays stable, a pending attempt is `aria-busy` rather than `disabled`, the width is held across every label, and the "Unfollow" preview only appears on hover or keyboard focus of a fine pointer. `sound` plays toggle-on, toggle-off and error cues. The state machine lives in a framework-free core shared with the Svelte and Vue packages.
