import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/**
 * The usage per framework: an alert dialog renders its opener only when a
 * `trigger` is supplied, which the playground's controls cannot express, so
 * the export carries the trigger next to the scalar props.
 */
export function alertDialogCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const name of ["title", "description", "confirmLabel", "cancelLabel"])
		if (values[name]) attrs.push(attribute(name, String(values[name]), framework));
	if (values.sound === true) attrs.push("sound");
	const props = attrs.map((a) => `\n\t${a}`).join("");
	if (framework === "react") {
		return `<AlertDialog
	trigger={<Button variant="destructive">Delete project</Button>}${props}
/>`;
	}
	if (framework === "vue") {
		return `<AlertDialog${props}>
	<template #trigger><Button variant="destructive">Delete project</Button></template>
</AlertDialog>`;
	}
	return `{#snippet trigger()}
	<Button variant="destructive">Delete project</Button>
{/snippet}

<AlertDialog {trigger}${props} />`;
}
