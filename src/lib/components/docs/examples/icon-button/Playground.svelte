<script lang="ts">
	import { IconButton, type IconButtonShape } from "$lib/fancy-ui/icon-button";
	import type { ButtonSize, ButtonVariant } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { iconButtonCode } from "./code.js";

	const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));
</script>

<PropsPlayground
	component="IconButton"
	slug="icon-button"
	codeFor={iconButtonCode}
	required={["label"]}
	constraints={["`label` is required: an icon-only control has no other accessible name."]}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 40 },
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: opts(["primary", "secondary", "outline", "ghost", "accent", "destructive"]),
		},
		{ key: "size", type: "select", label: "Size", options: opts(["sm", "md", "lg"]) },
		{ key: "shape", type: "select", label: "Shape", options: opts(["square", "circle"]) },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "loading", type: "boolean", label: "Loading" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		label: "Like",
		variant: "outline",
		size: "md",
		shape: "square",
		disabled: false,
		loading: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<IconButton
			label={values.label as string}
			variant={values.variant as ButtonVariant}
			size={values.size as ButtonSize}
			shape={values.shape as IconButtonShape}
			disabled={values.disabled as boolean}
			loading={values.loading as boolean}
			sound={values.sound as boolean}
		>
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z"
				/>
			</svg>
		</IconButton>
	{/snippet}
</PropsPlayground>
