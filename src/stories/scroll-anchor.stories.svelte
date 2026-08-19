<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ScrollAnchor } from "$lib/fancy-ui/scroll-anchor";

	const LINES = Array.from({ length: 24 }, (_, i) => `Line ${i + 1} of the transcript.`);

	const { Story } = defineMeta({
		title: "AI Chat/ScrollAnchor",
		component: ScrollAnchor,
		tags: ["autodocs"],
		args: {
			active: true,
			bottomThreshold: 40,
			returnLabel: "Jump to latest",
			showReturn: true,
			maxHeight: "14rem",
		},
		argTypes: {
			active: {
				control: "boolean",
				description:
					"Whether the region pins itself to the bottom as content arrives — bind it to your streaming flag",
			},
			bottomThreshold: {
				control: "number",
				description: "How close to the bottom (px) still counts as pinned",
			},
			returnLabel: { control: "text", description: "Label on the floating return button" },
			showReturn: {
				control: "boolean",
				description: "Whether the return button appears once the reader scrolls away",
			},
			maxHeight: { control: "text", description: "Height cap on the scrolling region" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-lg p-6">
		<ScrollAnchor {...args} class="border-border bg-card/50 rounded-lg border">
			<div class="flex flex-col gap-2 p-4 font-mono text-xs">
				{#each LINES as line, i (`${line}#${i}`)}
					<p class="text-muted-foreground">{line}</p>
				{/each}
			</div>
		</ScrollAnchor>
		<p class="text-muted-foreground mt-3 text-xs">
			Scroll the region up: it lets go of the bottom and the return pill appears.
		</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Custom Label" {template} args={{ returnLabel: "Back to the answer" }} />

<Story name="No Return Button" {template} args={{ showReturn: false }} />

<Story name="Released" {template} args={{ active: false }} />
