<script lang="ts">
	import { Toaster, toast } from "$lib/fancy-ui/toast";
	import { Button } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import type { Framework } from "$lib/inspiration/types.js";

	type Variant = "success" | "error" | "info" | "loading";
	type Position =
		| "top-left"
		| "top-center"
		| "top-right"
		| "bottom-left"
		| "bottom-center"
		| "bottom-right";

	const str = (value: unknown) => JSON.stringify(String(value));

	/** A toast is a function call plus one Toaster, so the code is not a single tag. */
	function codeFor(values: Record<string, string | number | boolean>, framework: Framework) {
		const mount =
			values.position === "bottom-right"
				? "<Toaster />"
				: `<Toaster position=${str(values.position)} />`;
		const call = `toast({
	title: ${str(values.title)},
	description: ${str(values.description)},
	variant: ${str(values.variant)},
})`;
		if (framework === "react") {
			return `${mount}
<Button onClick={() => ${call}}>Show toast</Button>`;
		}
		if (framework === "vue") {
			return `${mount}
<Button :onclick="() => ${call}">Show toast</Button>`;
		}
		return `${mount}
<Button onclick={() => ${call}}>Show toast</Button>`;
	}
</script>

<PropsPlayground
	component="Toaster"
	slug="toast"
	importNames={{
		svelte: ["Toaster", "toast", "Button"],
		react: ["Toaster", "toast", "Button"],
		vue: ["Toaster", "toast", "Button"],
	}}
	constraints={[
		"Mount `<Toaster />` once near the app root; `toast()` can then be called from anywhere.",
		"A `loading` toast stays until it is dismissed.",
	]}
	{codeFor}
	controls={[
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "description", type: "text", label: "Description", maxLength: 120 },
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: ["success", "error", "info", "loading"].map((v) => ({ value: v, label: v })),
		},
		{
			key: "position",
			type: "select",
			label: "Position",
			options: [
				"top-left",
				"top-center",
				"top-right",
				"bottom-left",
				"bottom-center",
				"bottom-right",
			].map((v) => ({ value: v, label: v })),
		},
	]}
	initialValues={{
		title: "Theme saved",
		description: "CSS copied to the clipboard.",
		variant: "success",
		position: "bottom-right",
	}}
>
	{#snippet preview(values)}
		<Toaster position={values.position as Position} />
		<Button
			onclick={() => {
				toast({
					title: values.title as string,
					description: values.description as string,
					variant: values.variant as Variant,
					duration: 4000,
				});
			}}
		>
			Show toast
		</Button>
	{/snippet}
</PropsPlayground>
