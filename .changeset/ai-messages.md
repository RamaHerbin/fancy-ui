---
"fancy-ui-svelte": minor
---

Add the message surfaces of the AI/chat family: the `ChatMessage` compound (`ChatMessage`, `ChatMessageActions`, `ChatMessageAction`, `ChatMessageBranches`, plus its context contract) rendering one conversation turn aligned and dressed by its role — streaming body via the growing-string contract, hover-revealed action rail with confirm-state buttons, and a keyboard-accessible response-version navigator — alongside `PromptSuggestions` (staggered prompt pills that cascade in after a reply and replay on re-show) and `ChatError` (quiet inline failure banner with a self-disabling retry). All SSR-safe, reduced-motion aware, themable via `--ft-*` hooks, with colocated tests, docs examples, and stories.
