---
"fancy-ui-svelte": minor
---

Complete the AI/chat family with its thread layer: `ScrollAnchor` (a scroll region that pins to its last line while content streams, releases when the reader scrolls up, and floats a "Jump to latest" pill that respects reduced motion and hands focus back), `ThreadList` (conversation history with unread dots, one shared relative-time clock for the whole list, selection, and per-row delete as a true sibling control), and `ChatPanel` with `ChatEmptyState` (the conversation shell — sticky header and composer rows around a transcript that opens at its latest turn and tracks content growth without scroll events). The internals autoscroll action now re-reads its container on reconnect, and list keys across the family are identity-stable under both duplicates and reorders. The docs gain a Full Conversation capstone demo composing fourteen components of the family end to end, social cards for all twenty-eight new components, and updated component counts.
