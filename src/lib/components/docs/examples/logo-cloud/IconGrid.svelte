<script lang="ts">
	import { IconLogoCloud } from "$lib/fancy-ui/logo-cloud";

	const logos = [
		{ name: "Vercel", path: "https://svgl.app/library/vercel_wordmark.svg" },
		{ name: "Svelte", path: "https://svgl.app/library/svelte.svg" },
		{ name: "Tailwind CSS", path: "https://svgl.app/library/tailwindcss.svg" },
		{ name: "TypeScript", path: "https://svgl.app/library/typescript.svg" },
		{ name: "Prisma", path: "https://svgl.app/library/prisma.svg" },
		{ name: "Stripe", path: "https://svgl.app/library/stripe_wordmark.svg" },
	];
</script>

<div class="overflow-hidden rounded-lg border">
	<IconLogoCloud title="Built with" {logos} />
</div>
