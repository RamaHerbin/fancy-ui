<script lang="ts">
	import { AnimatedTestimonials } from "$lib/fancy-ui/animated-testimonials";
	import type { Testimonial } from "$lib/fancy-ui/animated-testimonials";

	const testimonials: Testimonial[] = [
		{
			quote:
				"Outstanding support and robust features. It's rare to find a product that delivers on all its promises.",
			name: "James Kim",
			designation: "Engineering Lead at DataPro",
			src: "https://images.unsplash.com/photo-1636041293178-808a6762ab39?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote: "The scalability and performance have been game-changing for our organization.",
			name: "Lisa Thompson",
			designation: "VP of Technology at FutureNet",
			src: "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?w=500&auto=format&fit=crop&q=60",
		},
		{
			quote: "Implementation was seamless and the results exceeded our expectations.",
			name: "Michael Rivera",
			designation: "CTO at InnovateSphere",
			src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&auto=format&fit=crop&q=60",
		},
	];
</script>

<div class="flex min-h-[400px] items-center justify-center">
	<AnimatedTestimonials {testimonials} autoplay interval={3000} />
</div>
