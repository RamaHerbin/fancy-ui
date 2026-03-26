<script lang="ts">
	import { Sparkles } from "$lib/fancy-ui/sparkles";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<svelte:head>
	<title>Sparkles - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Sparkles</h1>
	<p class="text-muted-foreground mb-8">Canvas-based floating particle sparkle effect.</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Default</h2>
		<div class="h-64 overflow-hidden rounded-lg border">
			<Sparkles />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<div class="h-64 overflow-hidden rounded-lg border">
			<Sparkles background="#1a0533" particleColor="#e879f9" speed={2} particleDensity={80} />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Dense & Fast</h2>
		<div class="h-64 overflow-hidden rounded-lg border">
			<Sparkles
				background="#0c1222"
				particleColor="#fbbf24"
				speed={8}
				particleDensity={200}
				maxSize={4}
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: 'background', type: 'color', label: 'Background' },
				{ key: 'particleColor', type: 'color', label: 'Particle Color' },
			]}
			initialValues={{ background: '#0d47a1', particleColor: '#ffffff' }}
		>
			{#snippet preview(values)}
				<div class="h-64 w-full overflow-hidden rounded-xl border">
					<Sparkles background={values.background as string} particleColor={values.particleColor as string} />
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
