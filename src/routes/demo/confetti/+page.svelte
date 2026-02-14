<script lang="ts">
	import { ConfettiButton } from '$lib/fancy-ui/confetti';
</script>

<svelte:head>
	<title>Confetti - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Confetti</h1>
	<p class="text-muted-foreground mb-8">Confetti celebration effect powered by canvas-confetti.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Button Trigger</h2>
		<div class="border rounded-lg p-12 bg-card flex items-center justify-center">
			<ConfettiButton>
				<span class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
					Click for confetti!
				</span>
			</ConfettiButton>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Options</h2>
		<div class="border rounded-lg p-12 bg-card flex items-center justify-center gap-4">
			<ConfettiButton options={{ particleCount: 200, spread: 100 }}>
				<span class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700 transition-colors">
					Big burst
				</span>
			</ConfettiButton>
			<ConfettiButton options={{ particleCount: 50, colors: ['#ff0000', '#00ff00', '#0000ff'] }}>
				<span class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700 transition-colors">
					RGB confetti
				</span>
			</ConfettiButton>
		</div>
	</section>
</div>
