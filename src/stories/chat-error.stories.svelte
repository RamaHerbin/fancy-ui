<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ChatError } from "$lib/fancy-ui/chat-error";

	const { Story } = defineMeta({
		title: "AI Chat/ChatError",
		component: ChatError,
		tags: ["autodocs"],
		args: {
			message: "The assistant couldn't finish that reply",
			retryLabel: "Retry",
			retrying: false,
		},
		argTypes: {
			message: { control: "text", description: "The failure line" },
			detail: {
				control: "text",
				description: "Secondary muted line under the message, e.g. the error code",
			},
			retryLabel: { control: "text", description: "Label for the retry button" },
			retrying: {
				control: "boolean",
				description: "Whether a retry is in flight: disables the button and marks the row busy",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-24 w-full max-w-md items-center justify-center">
		<ChatError {...args} onRetry={() => {}} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="With Detail" {template} args={{ detail: "network_error · request 8f21c0" }} />

<Story
	name="Retrying"
	{template}
	args={{ detail: "network_error · request 8f21c0", retrying: true }}
/>
