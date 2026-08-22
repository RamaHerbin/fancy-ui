<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { StatusMorph } from "$lib/fancy-ui/status-morph";

	const { Story } = defineMeta({
		title: "Feedback/StatusMorph",
		component: StatusMorph,
		tags: ["autodocs"],
		args: {
			state: "loading",
			resetAfter: 1800,
			tone: "current",
			haptic: false,
		},
		argTypes: {
			state: {
				control: "select",
				options: ["idle", "loading", "success", "error"],
				description: "Current state; external writes are always honoured",
			},
			resetAfter: {
				control: "number",
				description: "ms until auto-reset to idle after success/error; 0 disables the timer",
			},
			tone: {
				control: "select",
				options: ["current", "semantic"],
				description: "currentColor everywhere, or the AI-family --ft-status-* vocabulary",
			},
			haptic: {
				control: "boolean",
				description: "Best-effort vibration on entering success/error",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="text-foreground flex h-32 w-full items-center justify-center text-3xl">
		<StatusMorph {...args} />
	</div>
{/snippet}

<Story name="Loading" {template} />

<Story name="Success" {template} args={{ state: "success", resetAfter: 0 }} />

<Story name="Error" {template} args={{ state: "error", resetAfter: 0 }} />

<Story name="Idle" {template} args={{ state: "idle" }} />

<Story
	name="Semantic Tone"
	{template}
	args={{ state: "success", tone: "semantic", resetAfter: 0 }}
/>

{#snippet idleIcon()}
	<svg
		class="size-full"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="4" />
		<path
			d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
		/>
	</svg>
{/snippet}

<Story name="Custom Idle" {template} args={{ state: "idle", idle: idleIcon }} />
