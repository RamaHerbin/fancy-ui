<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TracingBeam } from "$lib/fancy-ui/tracing-beam";

	// TracingBeam highlights window-scroll progress alongside its content, so the
	// story is rendered at natural height and the Storybook canvas iframe is
	// scrolled to reveal the beam (an inner overflow container would not fire the
	// window scroll listener the component relies on).
	const { Story } = defineMeta({
		title: "Effects/TracingBeam",
		component: TracingBeam,
		tags: ["autodocs"],
	});
</script>

{#snippet template()}
	<TracingBeam>
		<div class="max-w-2xl space-y-16 pl-8">
			<div>
				<span class="mb-2 block text-xs font-semibold tracking-wider text-emerald-500 uppercase"
					>Step 1</span
				>
				<h2 class="mb-3 text-xl font-semibold">Getting Started</h2>
				<p class="text-muted-foreground leading-relaxed">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
					ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
					ullamco laboris.
				</p>
			</div>

			<div>
				<span class="mb-2 block text-xs font-semibold tracking-wider text-purple-500 uppercase"
					>Step 2</span
				>
				<h2 class="mb-3 text-xl font-semibold">Configuration</h2>
				<p class="text-muted-foreground leading-relaxed">
					Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae
					vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur.
				</p>
			</div>

			<div>
				<span class="mb-2 block text-xs font-semibold tracking-wider text-blue-500 uppercase"
					>Step 3</span
				>
				<h2 class="mb-3 text-xl font-semibold">Advanced Usage</h2>
				<p class="text-muted-foreground leading-relaxed">
					Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae
					consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.
				</p>
			</div>
		</div>
	</TracingBeam>
{/snippet}

<Story name="Default" {template} />
