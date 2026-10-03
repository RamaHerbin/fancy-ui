---
"fancy-ui-svelte": patch
---

Docs site: "Describe an interaction" on /inspiration can read a sentence ("a button that glows when I hover it") as gallery filters — interaction, style and kind of element, each applied only when the model is confident and shown as "Understood as …" with a way back to the exact words. It runs server-side and only when `TYPESAFE_API_KEY` is set; otherwise, and on any error, the gallery searches the words, which now match independently (stop words ignored, simple stems).
