<script lang="ts">
	import { AnimatedLogoCloud, StaticLogoCloud, IconLogoCloud } from "$lib/fancy-ui/logo-cloud";

	const logos = [
		{ name: "Vercel", path: "https://svgl.app/library/vercel_wordmark.svg" },
		{ name: "Next.js", path: "https://svgl.app/library/nextjs_icon_dark.svg" },
		{ name: "Supabase", path: "https://svgl.app/library/supabase_wordmark.svg" },
		{ name: "Tailwind CSS", path: "https://svgl.app/library/tailwindcss.svg" },
		{ name: "Prisma", path: "https://svgl.app/library/prisma.svg" },
		{ name: "TypeScript", path: "https://svgl.app/library/typescript.svg" },
		{ name: "Stripe", path: "https://svgl.app/library/stripe_wordmark.svg" },
		{ name: "Svelte", path: "https://svgl.app/library/svelte.svg" },
	];
</script>

<svelte:head>
	<title>LogoCloud - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">LogoCloud</h1>
	<p class="text-muted-foreground mb-8">
		Logo display components in three variants: animated infinite scroll, static grid, and compact
		icon grid. Logos automatically adapt to light/dark theme.
	</p>

	<!-- Animated -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animated (Marquee)</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Infinite horizontal scroll with edge fade mask. Logos are duplicated 5x for seamless looping.
		</p>
		<div class="bg-card overflow-hidden rounded-lg border">
			<AnimatedLogoCloud title="Trusted by the best" {logos} />
		</div>
	</section>

	<!-- Static Grid -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Static Grid</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Responsive grid layout. 3 columns on mobile, 5 on tablet, 8 on desktop.
		</p>
		<div class="bg-card overflow-hidden rounded-lg border">
			<StaticLogoCloud title="Our partners" {logos} />
		</div>
	</section>

	<!-- Icon Grid -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Icon Grid</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Compact variant with smaller logos, suited for tooling or tech stack displays.
		</p>
		<div class="bg-card overflow-hidden rounded-lg border">
			<IconLogoCloud title="Built with" {logos} />
		</div>
	</section>
</div>
