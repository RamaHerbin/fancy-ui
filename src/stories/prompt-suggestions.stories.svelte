<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { PromptSuggestions } from "$lib/fancy-ui/prompt-suggestions";

	const SUGGESTIONS = [
		"Why was the lockfile stale?",
		"Show me the failing job",
		"Turn the cache back on",
	];

	const { Story } = defineMeta({
		title: "AI Chat/PromptSuggestions",
		component: PromptSuggestions,
		tags: ["autodocs"],
		args: {
			suggestions: SUGGESTIONS,
			visible: true,
			staggerMs: 60,
			label: "Suggestions",
		},
		argTypes: {
			suggestions: { control: "object", description: "Prompt texts offered to the user" },
			visible: {
				control: "boolean",
				description: "Whether the pills are shown; flipping this to true replays the entrance",
			},
			staggerMs: {
				control: "number",
				description: "Delay between two consecutive pills entering, in milliseconds",
			},
			label: { control: "text", description: "Accessible name of the group wrapping the pills" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-32 w-full max-w-xl items-center justify-center">
		<PromptSuggestions {...args} />
	</div>
{/snippet}

{#snippet afterReply(args: any)}
	<div class="flex w-full max-w-xl flex-col gap-3">
		<div class="bg-muted text-foreground mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
			<p class="text-sm leading-relaxed">
				The build is green again — the failure came from a stale lockfile in the CI cache, not from
				anything in your branch.
			</p>
		</div>
		<PromptSuggestions {...args} />
	</div>
{/snippet}

{#snippet withCustomItem(args: any)}
	<div class="flex min-h-32 w-full max-w-xl items-center justify-center">
		<PromptSuggestions {...args}>
			{#snippet item(suggestion: string)}
				<span class="flex items-center gap-1.5">
					<span class="bg-muted-foreground/60 size-1.5 rounded-full" aria-hidden="true"></span>
					{suggestion}
				</span>
			{/snippet}
		</PromptSuggestions>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="After a reply" template={afterReply} args={{ label: "Follow-up prompts" }} />

<Story name="Slow cascade" {template} args={{ staggerMs: 180 }} />

<Story name="Custom pill content" template={withCustomItem} />
