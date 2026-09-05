<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { StickyScroll } from "$lib/fancy-ui/sticky-scroll";

	interface Step {
		eyebrow: string;
		title: string;
		body: string;
		gradient: string;
	}

	const steps: Step[] = [
		{
			eyebrow: "Step 1",
			title: "Compose",
			body: "Start from a blank canvas or a saved template. Every keystroke auto-saves, so a dropped connection never costs you the draft.",
			gradient: "from-sky-400 to-blue-600",
		},
		{
			eyebrow: "Step 2",
			title: "Review",
			body: 'A quiet second pass catches what a first draft always misses — a broken link, a subject line that still says "Draft".',
			gradient: "from-violet-400 to-purple-600",
		},
		{
			eyebrow: "Step 3",
			title: "Send",
			body: "One click hands it to the queue, not the network — retries and delivery receipts are handled for you.",
			gradient: "from-emerald-400 to-teal-600",
		},
	];

	// StickyScroll's active-item tracking watches the VIEWPORT (its `inView`
	// action doesn't expose a `root` override), so — like Timeline and
	// TracingBeam — this story renders at natural height and relies on the
	// Storybook canvas iframe being scrolled to see the sticky panel travel
	// and swap between steps.
	const { Story } = defineMeta({
		title: "Layout/StickyScroll",
		component: StickyScroll,
		tags: ["autodocs"],
		args: {
			panelSide: "end",
			crossfade: true,
			panelHidden: true,
		},
		argTypes: {
			panelSide: {
				control: "select",
				options: ["start", "end"],
				description: "Which logical side the sticky panel sits on",
			},
			crossfade: {
				control: "boolean",
				description: "Whether the panel crossfades between items (always off under reduced motion)",
			},
			panelHidden: {
				control: "boolean",
				description: "Whether the panel is aria-hidden — off only when its content is unique",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<StickyScroll {...args} items={steps}>
		{#snippet item(step: Step, index: number, active: boolean)}
			<div
				class="flex min-h-[22rem] flex-col justify-center gap-3 transition-opacity duration-300"
				class:opacity-40={!active}
			>
				<span class="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
					>{step.eyebrow}</span
				>
				<h3 class="text-foreground text-2xl font-semibold">{step.title}</h3>
				<p class="text-muted-foreground max-w-md leading-relaxed">{step.body}</p>
			</div>
		{/snippet}
		{#snippet panel(step: Step)}
			<div
				class="flex h-64 w-full items-center justify-center rounded-xl bg-gradient-to-br {step.gradient}"
			>
				<span class="text-2xl font-semibold text-white/90">{step.title}</span>
			</div>
		{/snippet}
	</StickyScroll>
{/snippet}

<Story name="Default" {template} />

<Story name="Panel Start" {template} args={{ panelSide: "start" }} />

<Story name="No Crossfade" {template} args={{ crossfade: false }} />
