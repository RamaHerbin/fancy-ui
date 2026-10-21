---
"fancy-ui-react": patch
---

FollowButton: an uncontrolled button with a request pending that becomes controlled (`following` goes from undefined to a value, even the same one) now drops that request instead of reporting it later through `onFollowingChange`. With no explicit `variant`, the primary state also keeps a transparent 1px border, so the button no longer grows by 2px on follow.
