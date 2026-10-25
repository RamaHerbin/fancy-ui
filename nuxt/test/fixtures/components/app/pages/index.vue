<template>
	<main>
		<FancyShimmerButton data-testid="shimmer" shimmer-color="#ff00ff">Shimmer</FancyShimmerButton>
		<div class="relative" data-testid="lazy-host">
			<LazyFancyBorderBeam />
		</div>
		<fancy-badge data-testid="kebab-badge">Kebab</fancy-badge>
	</main>
</template>
