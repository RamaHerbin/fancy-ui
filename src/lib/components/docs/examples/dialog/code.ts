import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The usage per framework: a dialog needs its trigger, footer and open state next to it. */
export function dialogCode(values: Record<string, PlaygroundScalar>, framework: Framework): string {
	const text = (name: string) => attribute(name, String(values[name]), framework);
	const notDismissible = values.dismissible === false;
	if (framework === "react") {
		return `<Dialog
	open={open}
	onOpenChange={setOpen}
	${text("title")}
	${text("description")}${notDismissible ? "\n\tdismissible={false}" : ""}
	trigger={<Button>Open dialog</Button>}
	footer={<Button onClick={() => setOpen(false)}>Done</Button>}
>
	Dialog content
</Dialog>`;
	}
	if (framework === "vue") {
		return `<Dialog
	v-model:open="open"
	${text("title")}
	${text("description")}${notDismissible ? '\n\t:dismissible="false"' : ""}
>
	<template #trigger><Button>Open dialog</Button></template>
	Dialog content
	<template #footer><Button @click="open = false">Done</Button></template>
</Dialog>`;
	}
	return `{#snippet trigger()}
	<Button>Open dialog</Button>
{/snippet}

{#snippet footer()}
	<Button onclick={() => (open = false)}>Done</Button>
{/snippet}

<Dialog
	bind:open
	{trigger}
	{footer}
	${text("title")}
	${text("description")}${notDismissible ? "\n\tdismissible={false}" : ""}
>
	Dialog content
</Dialog>`;
}
