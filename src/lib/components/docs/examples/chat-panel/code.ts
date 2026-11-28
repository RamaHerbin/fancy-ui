import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DATA = `const turns = [
	{ role: "user", content: "Why does my transcript jump around while an answer comes in?" },
	{ role: "assistant", content: "Something scrolls it for you on every chunk, wherever you were." },
	{ role: "user", content: "And if I scroll up to re-read something?" },
	{ role: "assistant", content: "The panel only follows the bottom while you are already there." },
	{ role: "user", content: "So I can read in peace?" },
	{ role: "assistant", content: "Yes. A pill brings you back down when you are ready." },
];`;

const HEADER = `<div class="flex items-center justify-between gap-3 px-4 py-3">
	<p class="text-sm font-semibold">Scrolling behaviour</p>
</div>`;

/**
 * The usage per framework: the panel is made of regions (header, transcript,
 * empty state), which the controls cannot express, so the export carries the
 * turns and the regions, inside the fixed height the message region scrolls
 * in.
 */
export function chatPanelCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.empty === true) attrs.push("empty");
	if (values.streaming === true) attrs.push("streaming");
	if (values.returnLabel && values.returnLabel !== "Jump to latest")
		attrs.push(attribute("returnLabel", String(values.returnLabel), framework));
	if (values.label && values.label !== "Conversation")
		attrs.push(attribute("label", String(values.label), framework));
	if (values.sound === true) attrs.push("sound");
	const props = attrs.map((a) => `\n\t\t${a}`).join("");
	const open = `<ChatPanel${props}${props ? "\n\t" : ""}`;
	const empty = `<ChatEmptyState title="How can I help?" description="Ask anything about the library." />`;

	if (framework === "react") {
		const header = HEADER.replace(/class=/g, "className=")
			.split("\n")
			.map((l) => `\t\t\t${l}`)
			.join("\n");
		return `${DATA}

<div className="h-[22rem]">
	${open.replace(/\n\t$/, "")}
		header={
${header}
		}
		emptyState={
			${empty}
		}
	>
		<div className="flex flex-col gap-5 px-4 py-4">
			{turns.map((turn, i) => (
				<ChatMessage key={i} role={turn.role} content={turn.content} />
			))}
		</div>
	</ChatPanel>
</div>`;
	}
	const header = HEADER.split("\n")
		.map((l) => `\t\t\t${l}`)
		.join("\n");
	if (framework === "vue") {
		return `<script setup lang="ts">
${DATA}
</script>

<div class="h-[22rem]">
	${open}>
		<template #header>
${header}
		</template>
		<template #emptyState>
			${empty}
		</template>
		<div class="flex flex-col gap-5 px-4 py-4">
			<ChatMessage v-for="(turn, i) in turns" :key="i" :role="turn.role" :content="turn.content" />
		</div>
	</ChatPanel>
</div>`;
	}
	return `<script lang="ts">
${DATA}
</script>

<div class="h-[22rem]">
	${open}>
		{#snippet header()}
${header}
		{/snippet}
		{#snippet emptyState()}
			${empty}
		{/snippet}
		<div class="flex flex-col gap-5 px-4 py-4">
			{#each turns as turn, i (i)}
				<ChatMessage role={turn.role} content={turn.content} />
			{/each}
		</div>
	</ChatPanel>
</div>`;
}
