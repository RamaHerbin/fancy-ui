<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { BlockToken } from "./markdown.js";

export interface MarkdownProps {
	/** Markdown source. Safe to update on every streamed chunk. */
	text?: string;
	class?: HTMLAttributes["class"];
	/**
	 * Already-parsed blocks, used when the component renders itself for a
	 * blockquote. Consumers pass `text`.
	 */
	blocks?: BlockToken[];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../utils.js";
import { parseMarkdown } from "./markdown.js";
import MarkdownInline from "./MarkdownInline.vue";
import "./markdown.css";

defineOptions({ name: "Markdown", inheritAttrs: false });

const { text = "", class: className, blocks } = defineProps<MarkdownProps>();
/**
 * Rendered inline at the very end of the document — a streaming caret, say.
 * Every block here is block-level, so a caret placed after the component
 * would sit on its own line instead of trailing the last character; this
 * slot lands inside the last paragraph, heading or list item instead. A
 * document ending in code, a table, a rule, or nothing at all has no inline
 * tail to hold it, and drops it.
 */
defineSlots<{ trailingCursor?: () => unknown }>();

const nodes = computed(() => blocks ?? parseMarkdown(text));
const lastIndex = computed(() => nodes.value.length - 1);
</script>

<template>
	<div :class="cn('ft-md', className)">
		<template v-for="(block, index) in nodes" :key="index">
			<p v-if="block.type === 'paragraph'" class="ft-md-p">
				<MarkdownInline :tokens="block.children" /><slot
					v-if="index === lastIndex"
					name="trailingCursor"
				/>
			</p>
			<component
				:is="`h${block.depth}`"
				v-else-if="block.type === 'heading'"
				class="ft-md-h"
				:data-depth="block.depth"
			>
				<MarkdownInline :tokens="block.children" /><slot
					v-if="index === lastIndex"
					name="trailingCursor"
				/>
			</component>
			<pre v-else-if="block.type === 'code'" class="ft-md-pre" :data-lang="block.lang || null"><code>{{ block.text }}</code></pre>
			<ol v-else-if="block.type === 'list' && block.ordered" class="ft-md-ol" :start="block.start">
				<li v-for="(item, itemIndex) in block.items" :key="itemIndex">
					<MarkdownInline :tokens="item" /><slot
						v-if="index === lastIndex && itemIndex === block.items.length - 1"
						name="trailingCursor"
					/>
				</li>
			</ol>
			<ul v-else-if="block.type === 'list'" class="ft-md-ul">
				<li v-for="(item, itemIndex) in block.items" :key="itemIndex">
					<MarkdownInline :tokens="item" /><slot
						v-if="index === lastIndex && itemIndex === block.items.length - 1"
						name="trailingCursor"
					/>
				</li>
			</ul>
			<blockquote v-else-if="block.type === 'blockquote'" class="ft-md-quote">
				<Markdown :blocks="block.children">
					<template v-if="index === lastIndex" #trailingCursor
						><slot name="trailingCursor"
					/></template>
				</Markdown>
			</blockquote>
			<div v-else-if="block.type === 'table'" class="ft-md-table-scroll">
				<table class="ft-md-table">
					<thead>
						<tr>
							<th
								v-for="(cell, i) in block.header"
								:key="i"
								:style="{ textAlign: block.align[i] ?? undefined }"
							>
								<MarkdownInline :tokens="cell" />
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
							<td
								v-for="(cell, i) in row"
								:key="i"
								:style="{ textAlign: block.align[i] ?? undefined }"
							>
								<MarkdownInline :tokens="cell" />
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<hr v-else-if="block.type === 'hr'" class="ft-md-hr" />
		</template>
	</div>
</template>
