<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { HoverCard } from "$lib/fancy-ui/hover-card";

	const { Story } = defineMeta({
		title: "Overlays/HoverCard",
		component: HoverCard,
		tags: ["autodocs"],
		args: {
			side: "bottom",
			align: "center",
			offset: 8,
			openDelay: 300,
			closeDelay: 150,
		},
		argTypes: {
			side: { control: "select", options: ["top", "bottom", "left", "right"] },
			align: { control: "select", options: ["start", "center", "end"] },
			offset: { control: "number" },
			openDelay: { control: "number", description: "ms before the card opens on hover" },
			closeDelay: {
				control: "number",
				description: "ms the pointer has to travel from the trigger to the card",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex justify-center py-16">
		<HoverCard {...args}>
			{#snippet trigger(describedBy)}
				<button
					type="button"
					aria-describedby={describedBy}
					class="text-[13px] font-medium text-violet-300 hover:underline"
				>
					@alexrivera
				</button>
			{/snippet}
			{#snippet children()}
				<div class="flex items-center gap-2.5">
					<span class="h-9 w-9 flex-none rounded-full bg-gradient-to-br from-violet-500 to-sky-400"
					></span>
					<div class="flex flex-col">
						<span class="text-[13px] font-semibold">Alex Rivera</span>
						<span class="text-muted-foreground text-[11px]">@alexrivera</span>
					</div>
				</div>
				<p class="text-muted-foreground text-[12px] leading-relaxed">
					Frontend engineer. Building accessible interfaces, one component at a time.
				</p>
				<div class="text-muted-foreground flex gap-3.5 text-[11px]">
					<span><strong class="text-foreground">1.2k</strong> followers</span>
					<span><strong class="text-foreground">60</strong> repositories</span>
				</div>
			{/snippet}
		</HoverCard>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Top" {template} args={{ side: "top" }} />

<Story name="Fast" {template} args={{ openDelay: 50, closeDelay: 50 }} />
