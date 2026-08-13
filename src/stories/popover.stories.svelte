<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Popover } from "$lib/fancy-ui/popover";

	const { Story } = defineMeta({
		title: "Overlays/Popover",
		component: Popover,
		tags: ["autodocs"],
		args: {
			side: "bottom",
			align: "center",
			offset: 8,
			dismissible: true,
		},
		argTypes: {
			side: {
				control: "select",
				options: ["top", "right", "bottom", "left"],
				description: "Side of the trigger to place the panel on",
			},
			align: {
				control: "select",
				options: ["start", "center", "end"],
				description: "Alignment along the trigger's cross axis",
			},
			offset: { control: "number", description: "Gap in pixels between the trigger and the panel" },
			dismissible: {
				control: "boolean",
				description: "Whether Escape and an outside click close the panel",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<Popover {...args} class="w-[220px]">
		{#snippet trigger()}
			⚙ Options
		{/snippet}

		<span class="text-[13px] font-semibold">Dimensions</span>
		<div class="flex gap-2">
			<div
				class="border-border bg-background text-muted-foreground flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
			>
				W 100%
			</div>
			<div
				class="border-border bg-background text-muted-foreground flex-1 rounded-[6px] border px-2 py-[5px] text-[12px]"
			>
				H 25px
			</div>
		</div>
	</Popover>
{/snippet}

<Story name="Default" {template} />

<Story name="Right, start-aligned" {template} args={{ side: "right", align: "start" }} />

<Story name="Not dismissible" {template} args={{ dismissible: false }} />
