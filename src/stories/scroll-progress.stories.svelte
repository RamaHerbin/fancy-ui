<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ScrollProgress } from "$lib/fancy-ui/scroll-progress";

	// `position="top"`/`"bottom"` track the page's own scroll, so those stories
	// render extra height and rely on the Storybook canvas iframe being
	// scrolled to see the bar move — the same convention already used by
	// Timeline and TracingBeam. The "Inline target" story below is
	// self-contained instead: it tracks a local scroll box via `target`, so it
	// reads correctly without scrolling the story canvas at all.
	const { Story } = defineMeta({
		title: "Navigation/ScrollProgress",
		component: ScrollProgress,
		tags: ["autodocs"],
		args: {
			position: "top",
		},
		argTypes: {
			position: {
				control: "select",
				options: ["top", "bottom", "inline"],
				description: "Where the bar renders: pinned to a viewport edge, or in normal flow",
			},
			label: {
				control: "text",
				description:
					'Accessible name; announces the bar as role="progressbar" with a live percentage, and forces JS mode',
			},
		},
	});
</script>

<script lang="ts">
	let box = $state<HTMLElement | null>(null);
</script>

{#snippet article()}
	<h2 class="text-foreground text-xl font-semibold">Scroll this story</h2>
	<p class="text-muted-foreground leading-relaxed">
		The bar above tracks this canvas's own scroll position — scroll down to watch it fill, and back
		up to watch it empty. Nothing here is timed or looped; the fill is a direct, 1:1 mapping of how
		far you've scrolled.
	</p>
	<p class="text-muted-foreground leading-relaxed">
		On a browser that supports CSS scroll-driven animations, this is running with zero JavaScript —
		a native <code class="text-xs">animation-timeline: scroll()</code> keyframe paints the fill before
		hydration even finishes. Everywhere else, a throttled scroll listener does the same job.
	</p>
	<p class="text-muted-foreground leading-relaxed">
		Keep scrolling — there's more filler below purely to give the bar somewhere to travel.
	</p>
	<p class="text-muted-foreground leading-relaxed">
		A reading-progress bar is one of the few animated components in this library that is
		deliberately <em>not</em> gated behind <code class="text-xs">prefers-reduced-motion</code>: it
		never moves on its own, only in direct response to the reader's own scrolling.
	</p>
	<p class="text-muted-foreground leading-relaxed">
		Almost there. The next paragraph is the last one.
	</p>
	<p class="text-muted-foreground leading-relaxed">
		That's the bottom of the scroll range — the bar above should now read as completely filled.
	</p>
{/snippet}

{#snippet template(args: any)}
	<ScrollProgress {...args} />
	<div class="max-w-2xl space-y-6 p-8">
		{@render article()}
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Bottom" {template} args={{ position: "bottom" }} />

<Story name="Labelled" {template} args={{ label: "Reading progress" }} />

{#snippet inlineTemplate()}
	<div class="mx-auto flex w-full max-w-sm flex-col gap-2 p-8">
		<ScrollProgress target={box} position="inline" label="Reading progress" class="text-primary" />
		<div
			bind:this={box}
			class="border-border bg-card h-56 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed"
		>
			<div class="space-y-3">
				{@render article()}
			</div>
		</div>
		<p class="text-muted-foreground text-xs">
			<code class="text-xs">target</code> points the bar at this box instead of the page — scroll the
			box, not the canvas.
		</p>
	</div>
{/snippet}

<Story name="Inline target" template={inlineTemplate} />
