<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AnimatedLogoCloud, StaticLogoCloud, IconLogoCloud } from "$lib/fancy-ui/logo-cloud";

	const logos = [
		{ name: "Vercel", path: "https://svgl.app/library/vercel_wordmark.svg" },
		{ name: "Svelte", path: "https://svgl.app/library/svelte.svg" },
		{ name: "Tailwind CSS", path: "https://svgl.app/library/tailwindcss.svg" },
		{ name: "TypeScript", path: "https://svgl.app/library/typescript.svg" },
		{ name: "Prisma", path: "https://svgl.app/library/prisma.svg" },
		{ name: "Stripe", path: "https://svgl.app/library/stripe_wordmark.svg" },
	];

	const { Story } = defineMeta({
		title: "Data Display/LogoCloud",
		component: AnimatedLogoCloud,
		tags: ["autodocs"],
		args: {
			title: "Trusted by the best",
			logos,
		},
		argTypes: {
			title: { control: "text", description: "Optional title displayed above the logos" },
			logos: { control: "object", description: "Array of logos with name and image path" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="overflow-hidden rounded-lg border">
		<AnimatedLogoCloud {...args} />
	</div>
{/snippet}

<Story name="Animated" {template} />

{#snippet staticGrid(args: any)}
	<div class="overflow-hidden rounded-lg border">
		<StaticLogoCloud {...args} />
	</div>
{/snippet}

<Story name="Static Grid" template={staticGrid} args={{ title: "Our partners", logos }} />

{#snippet iconGrid(args: any)}
	<div class="overflow-hidden rounded-lg border">
		<IconLogoCloud {...args} />
	</div>
{/snippet}

<Story name="Icon Grid" template={iconGrid} args={{ title: "Built with", logos }} />
