<script lang="ts">
	import { Compare } from "$lib/fancy-ui/compare";

	let currentPercentage = $state(50);
</script>

<svelte:head>
	<title>Compare - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Compare</h1>
	<p class="text-muted-foreground mb-8">
		A before/after image comparison slider with hover and drag modes, plus optional autoplay.
	</p>

	<!-- Basic Usage (Hover Mode) -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage (Hover Mode)</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Move your mouse over the component to reveal the comparison. The slider follows your cursor.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80"
				firstImageAlt="Forest in autumn"
				secondImageAlt="Mountains at sunrise"
				class="rounded-lg"
			/>
		</div>
	</section>

	<!-- Drag Mode -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Drag Mode</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Click and drag to control the slider position. Set
			<code class="bg-muted rounded px-1.5 py-0.5">slideMode="drag"</code>.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1682687221038-404670f09ef1?w=800&q=80"
				firstImageAlt="Desert landscape"
				secondImageAlt="Ocean view"
				slideMode="drag"
				class="rounded-lg"
			/>
		</div>
	</section>

	<!-- Autoplay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Autoplay</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Enable automatic animation with <code class="bg-muted rounded px-1.5 py-0.5">autoplay</code>.
			Hover to pause.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80"
				firstImageAlt="Mountain peak"
				secondImageAlt="Mountain range"
				autoplay
				autoplayDuration={3000}
				class="rounded-lg"
			/>
		</div>
	</section>

	<!-- Custom Initial Position -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Initial Position</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Set the starting position with
			<code class="bg-muted rounded px-1.5 py-0.5">initialSliderPercentage</code>.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80"
				firstImageAlt="Nature landscape"
				secondImageAlt="Forest path"
				initialSliderPercentage={25}
				class="rounded-lg"
			/>
		</div>
	</section>

	<!-- Without Handlebar -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Without Handlebar</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Hide the drag handle with
			<code class="bg-muted rounded px-1.5 py-0.5">showHandlebar={"{"}false{"}"}</code>.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80"
				firstImageAlt="Lake view"
				secondImageAlt="Waterfall"
				showHandlebar={false}
				class="rounded-lg"
			/>
		</div>
	</section>

	<!-- With Event Callback -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Event Callback</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Track the slider position with the <code class="bg-muted rounded px-1.5 py-0.5"
				>onpercentagechange</code
			> callback.
		</p>
		<div class="bg-card flex flex-col items-center gap-4 rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80"
				firstImageAlt="Mountain landscape"
				secondImageAlt="Green valley"
				onpercentagechange={(p) => (currentPercentage = p)}
				class="rounded-lg"
			/>
			<p class="text-muted-foreground text-sm">
				Current position: <span class="text-foreground font-mono font-semibold"
					>{currentPercentage.toFixed(1)}%</span
				>
			</p>
		</div>
	</section>

	<!-- Custom Content -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Content</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use snippets to render custom content instead of images.
		</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<Compare class="rounded-lg">
				{#snippet firstContent()}
					<div
						class="flex size-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600"
					>
						<span class="text-2xl font-bold text-white">Before</span>
					</div>
				{/snippet}
				{#snippet secondContent()}
					<div
						class="flex size-full items-center justify-center bg-gradient-to-br from-rose-600 to-orange-600"
					>
						<span class="text-2xl font-bold text-white">After</span>
					</div>
				{/snippet}
			</Compare>
		</div>
	</section>

	<!-- Different Sizes -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Different Sizes</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Customize dimensions with the <code class="bg-muted rounded px-1.5 py-0.5">class</code> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<Compare
				firstImage="https://images.unsplash.com/photo-1540206395-68808572332f?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80"
				class="h-[200px] w-[300px] rounded-lg"
			/>
			<Compare
				firstImage="https://images.unsplash.com/photo-1540206395-68808572332f?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80"
				class="h-[200px] w-[200px] rounded-lg"
			/>
		</div>
	</section>
</div>
