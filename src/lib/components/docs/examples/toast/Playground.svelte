<script lang="ts">
	import { Toaster, toast } from "$lib/fancy-ui/toast";
	import { Button } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { toastCode } from "./code.js";

	type Variant = "success" | "error" | "info" | "loading";
	type Position =
		| "top-left"
		| "top-center"
		| "top-right"
		| "bottom-left"
		| "bottom-center"
		| "bottom-right";
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
	codeFor={toastCode}
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
