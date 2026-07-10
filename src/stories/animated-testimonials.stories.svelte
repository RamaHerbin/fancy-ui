<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AnimatedTestimonials } from "$lib/fancy-ui/animated-testimonials";
	import type { Testimonial } from "$lib/fancy-ui/animated-testimonials";

	const testimonials: Testimonial[] = [
		{
			quote:
				"The attention to detail and innovative features have completely transformed our workflow. This is exactly what we've been looking for.",
			name: "Sarah Chen",
			designation: "Product Manager at TechFlow",
			src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"Implementation was seamless and the results exceeded our expectations. The platform's flexibility is truly impressive.",
			name: "Michael Rivera",
			designation: "CTO at InnovateSphere",
			src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote:
				"This solution has significantly improved our team's productivity. The intuitive interface makes complex tasks simple.",
			name: "Emily Watson",
			designation: "Operations Director at CloudScale",
			src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?w=500&auto=format&fit=crop&q=60",
		},
	];

	const { Story } = defineMeta({
		title: "Data Display/AnimatedTestimonials",
		component: AnimatedTestimonials,
		tags: ["autodocs"],
		args: {
			testimonials,
			autoplay: false,
			interval: 5000,
		},
		argTypes: {
			testimonials: { control: "object", description: "Array of testimonials to display" },
			autoplay: { control: "boolean", description: "Auto-advance testimonials" },
			interval: {
				control: "number",
				description: "Interval between auto-advances in ms",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-[400px] items-center justify-center">
		<AnimatedTestimonials {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="With Autoplay" {template} args={{ autoplay: true, interval: 3000 }} />
