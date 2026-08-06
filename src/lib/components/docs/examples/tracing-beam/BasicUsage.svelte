<script lang="ts">
	import { TracingBeam } from "$lib/fancy-ui/tracing-beam";
</script>

<TracingBeam>
	<div class="max-w-2xl space-y-16 pl-8">
		<div>
			<span class="mb-2 block text-xs font-semibold tracking-wider text-emerald-500 uppercase"
				>v0.1</span
			>
			<h2 class="mb-3 text-xl font-semibold">The First Sketch</h2>
			<p class="text-muted-foreground leading-relaxed">
				It started as a folder of throwaway components and a single button that looked good in
				every theme. No tokens, no docs site, just a designer and an engineer arguing about border
				radius until 2am. That argument became the first commit.
			</p>
		</div>

		<div>
			<span class="mb-2 block text-xs font-semibold tracking-wider text-purple-500 uppercase"
				>v0.5</span
			>
			<h2 class="mb-3 text-xl font-semibold">Everything Learns to Move</h2>
			<p class="text-muted-foreground leading-relaxed">
				Static components gave way to a proper motion layer: spring-based transitions, shared
				layout animations, and a reduced-motion fallback for every single one of them. This is
				also when the team agreed on a rule that stuck — nothing animates without a reason.
			</p>
		</div>

		<div>
			<span class="mb-2 block text-xs font-semibold tracking-wider text-blue-500 uppercase"
				>v1.0</span
			>
			<h2 class="mb-3 text-xl font-semibold">Launch Day</h2>
			<p class="text-muted-foreground leading-relaxed">
				The API stabilized, the docs got real examples instead of placeholders, and the changelog
				finally had a version worth calling stable. Version 1.0 shipped quietly on a Tuesday, which
				felt right for something that took over a year of small decisions to get there.
			</p>
		</div>
	</div>
</TracingBeam>
