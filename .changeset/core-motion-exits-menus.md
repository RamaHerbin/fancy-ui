---
"fancy-ui-svelte": minor
---

Menus and the command menu now animate out as well as in. A second Escape during the fade no longer disappears into the panel that is already leaving — it reaches whatever is underneath. Dropdown, context and navigation menus reverse their 150 ms entrance from the same edge they grew out of, and a submenu now fades with the menu that owns it instead of hanging on at full strength and popping out at the end. The command menu is on the modal rung with dialogs rather than the menu rung — 300 ms in, 200 ms out, backdrop on the same clock — and the page it covers now stays locked until that backdrop is actually gone, instead of becoming scrollable the instant you dismiss. That change also retires a long-standing entrance bug where the command menu drifted in from half its own width off-centre.
