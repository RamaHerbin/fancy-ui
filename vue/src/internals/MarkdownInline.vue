<script lang="ts">
import type { InlineToken } from "./markdown.js";

export interface MarkdownInlineProps {
	tokens: InlineToken[];
}
</script>

<script setup lang="ts">
import "./markdown.css";

defineOptions({ name: "MarkdownInline", inheritAttrs: false });
defineProps<MarkdownInlineProps>();
</script>

<!--
	Whitespace between the branches below would show up in the rendered text, so
	the markup stays tightly packed — exactly as tight as the Svelte source, for
	the same reason.
-->
<template
	><template v-for="(token, index) in tokens" :key="index"
		><template v-if="token.type === 'text'">{{ token.text }}</template
		><code v-else-if="token.type === 'code'" class="ft-md-code">{{ token.text }}</code
		><strong v-else-if="token.type === 'strong'"><MarkdownInline :tokens="token.children" /></strong
		><em v-else-if="token.type === 'em'"><MarkdownInline :tokens="token.children" /></em
		><del v-else-if="token.type === 'del'"><MarkdownInline :tokens="token.children" /></del
		><a
			v-else-if="token.type === 'link' && token.href !== null"
			class="ft-md-link"
			:href="token.href"
			rel="noopener noreferrer nofollow ugc"
			target="_blank"
			><MarkdownInline :tokens="token.children" /></a
		><MarkdownInline v-else :tokens="token.children" /></template
></template>
