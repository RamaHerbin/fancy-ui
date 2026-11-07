<script lang="ts">
	import { FollowButton } from "$lib/fancy-ui/follow-button";
	import type { ButtonSize, ButtonVariant } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));
</script>

<PropsPlayground
	component="FollowButton"
	slug="follow-button"
	controls={[
		{ key: "following", type: "boolean", label: "Following" },
		{ key: "label", type: "text", label: "Accessible label", maxLength: 40 },
		{ key: "errorLabel", type: "text", label: "Error label", maxLength: 24 },
		{ key: "resetMs", type: "range", label: "Error reset (ms)", min: 500, max: 5000, step: 100 },
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: [
				{ value: "", label: "auto" },
				...opts(["primary", "secondary", "outline", "ghost", "accent", "destructive"]),
			],
		},
		{ key: "size", type: "select", label: "Size", options: opts(["sm", "md", "lg"]) },
		{ key: "iconOnly", type: "boolean", label: "Icon only" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		following: false,
		label: "Follow Rama",
		errorLabel: "Try again",
		resetMs: 2000,
		variant: "",
		size: "md",
		iconOnly: false,
		disabled: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<FollowButton
			following={values.following as boolean}
			label={values.label as string}
			errorLabel={values.errorLabel as string}
			resetMs={values.resetMs as number}
			variant={(values.variant as ButtonVariant) || undefined}
			size={values.size as ButtonSize}
			iconOnly={values.iconOnly as boolean}
			disabled={values.disabled as boolean}
			sound={values.sound as boolean}
		/>
	{/snippet}
</PropsPlayground>
