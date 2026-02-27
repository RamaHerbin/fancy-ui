<script lang="ts">
	import { ConfettiButton } from "$lib/fancy-ui/confetti";
</script>

<svelte:head>
	<title>Confetti - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Confetti</h1>
	<p class="text-muted-foreground mb-8">Confetti celebration effect powered by canvas-confetti.</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Button Trigger</h2>
		<div class="bg-card flex items-center justify-center rounded-lg border p-12">
			<ConfettiButton>
				<span
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors"
				>
					Click for confetti!
				</span>
			</ConfettiButton>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Options</h2>
		<div class="bg-card flex items-center justify-center gap-4 rounded-lg border p-12">
			<ConfettiButton options={{ particleCount: 200, spread: 100 }}>
				<span
					class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
				>
					Big burst
				</span>
			</ConfettiButton>
			<ConfettiButton options={{ particleCount: 50, colors: ["#ff0000", "#00ff00", "#0000ff"] }}>
				<span
					class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
				>
					RGB confetti
				</span>
			</ConfettiButton>
		</div>
	</section>
</div>
