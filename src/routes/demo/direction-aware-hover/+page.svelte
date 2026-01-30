<script lang="ts">
	import { DirectionAwareHover } from '$lib/fancy-ui/direction-aware-hover';
</script>

<svelte:head>
	<title>DirectionAwareHover - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<div class="mb-8">
		<a href="/demo" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to components</a>
	</div>

	<h1 class="mb-2 text-3xl font-bold">DirectionAwareHover</h1>
	<p class="mb-8 text-muted-foreground">
		An image card that reveals an overlay sliding in from the direction the mouse entered.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Hover from any edge to see the overlay slide in from that direction. The image shifts slightly on hover.
		</p>
		<div class="flex justify-center rounded-lg border bg-card p-8">
			<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80">
				<p class="text-xl font-bold">Mountain Peak</p>
				<p class="text-sm font-normal">Swiss Alps, Switzerland</p>
			</DirectionAwareHover>
		</div>
	</section>

	<!-- Multiple Cards -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Multiple Cards</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Works great in a grid layout. Try hovering from different directions on each card.
		</p>
		<div class="flex flex-wrap justify-center gap-6 rounded-lg border bg-card p-8">
			<DirectionAwareHover
				imageUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80"
				class="h-64 w-64 md:h-64 md:w-64 lg:h-64 lg:w-64 xl:h-64 xl:w-64"
			>
				<p class="text-lg font-bold">Nature</p>
				<p class="text-sm font-normal">Sunlit valley</p>
			</DirectionAwareHover>
			<DirectionAwareHover
				imageUrl="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80"
				class="h-64 w-64 md:h-64 md:w-64 lg:h-64 lg:w-64 xl:h-64 xl:w-64"
			>
				<p class="text-lg font-bold">Desert</p>
				<p class="text-sm font-normal">Golden dunes</p>
			</DirectionAwareHover>
			<DirectionAwareHover
				imageUrl="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80"
				class="h-64 w-64 md:h-64 md:w-64 lg:h-64 lg:w-64 xl:h-64 xl:w-64"
			>
				<p class="text-lg font-bold">Forest</p>
				<p class="text-sm font-normal">Autumn colors</p>
			</DirectionAwareHover>
		</div>
	</section>

	<!-- Custom Content -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Content</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			The overlay content is fully customizable via the default snippet.
		</p>
		<div class="flex justify-center rounded-lg border bg-card p-8">
			<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80">
				<div class="space-y-2">
					<p class="text-xl font-bold">Travel Photography</p>
					<p class="text-sm text-white/80">Discover breathtaking landscapes from around the world.</p>
					<div class="flex gap-2 pt-1">
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">Nature</span>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">Travel</span>
						<span class="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur-sm">Photo</span>
					</div>
				</div>
			</DirectionAwareHover>
		</div>
	</section>
</div>
