<script lang="ts">
	import { AnimatedTooltip } from '$lib/fancy-ui/animated-tooltip/index.js';
	import { Marquee } from '$lib/fancy-ui/marquee/index.js';
	import ReviewCard from '$lib/portfolio/ReviewCard.svelte';
	import type { Testimonial } from '$lib/portfolio/types.js';

	const testimonials: Testimonial[] = [
		{
			id: 1,
			name: 'Romain D\u00e9flache',
			designation: 'Art Director at Fleur de Papier',
			image:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
			testimonial:
				"I worked with Rama at Fleur de Papier, where he quickly became an integral part of the team. He combines graphic sensitivity with technical precision, capable of turning demanding artistic directions into performant and accessible web interfaces. His curiosity and attention to detail consistently elevated the quality of our work.",
			linkedinUrl: 'https://www.linkedin.com/in/romain-deflache',
			date: 'March 2023'
		},
		{
			id: 2,
			name: 'Hichem Rekouane',
			designation: 'R&D Engineer at Synopsys',
			image:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
			testimonial:
				"Rama is one of the most reliable front-end engineers I've worked with. He combines a strong sense of design with a pragmatic approach to problem-solving, which makes collaboration smooth and efficient. His code is clean, well-documented, and always delivered on time.",
			linkedinUrl: 'https://www.linkedin.com/in/hichem-rekouane',
			date: 'September 2024'
		},
		{
			id: 3,
			name: 'Justin M.',
			designation: 'Senior Software Engineer',
			image:
				'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=1000&q=80',
			testimonial:
				"Rama quickly mastered our complex Angular codebase and introduced a more scalable component architecture using signals. He also set up comprehensive unit tests that improved our team's confidence in releases.",
			linkedinUrl: 'https://www.linkedin.com/in/justin-m',
			date: 'June 2024'
		},
		{
			id: 4,
			name: 'Enzo G.',
			designation: 'Art Director & former classmate at Gobelins',
			image:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
			testimonial:
				"What I love about Rama's work is how he bridges technical precision with visual storytelling. He's not just coding interfaces \u2014 he's crafting experiences that feel alive.",
			linkedinUrl: 'https://www.linkedin.com/in/enzo-g',
			date: 'November 2022'
		},
		{
			id: 5,
			name: 'Mathilde H.',
			designation: 'Lead Software Engineer at Synopsys',
			image:
				'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=1000&q=80',
			testimonial:
				'Rama has a rare mix of technical depth and empathy. He listens, challenges assumptions, and always brings fresh ideas to the table. Working with him feels both productive and modern.',
			linkedinUrl: 'https://www.linkedin.com/in/mathilde-h',
			date: 'January 2024'
		}
	];

	const tooltipItems = testimonials.map((t) => ({
		id: t.id,
		name: t.name,
		designation: t.designation,
		image: t.image
	}));
</script>

<section id="testimonials" class="py-20 px-6">
	<div class="max-w-6xl mx-auto">
		<div class="text-center mb-16">
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
				They Worked With Me
			</h2>
			<p class="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
				Click on a colleague to read their testimonial and visit their LinkedIn profile
			</p>
		</div>

		<!-- AnimatedTooltip -->
		<div class="flex w-full flex-row items-center justify-center">
			<AnimatedTooltip items={tooltipItems} />
		</div>

		<!-- Marquee -->
		<div
			class="relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background md:shadow-xl"
		>
			<Marquee reverse pauseOnHover class="[--duration:20s]">
				{#each testimonials as review (review.id)}
					<ReviewCard
						img={review.image}
						name={review.name}
						username={review.name}
						body={review.testimonial}
						linkedinUrl={review.linkedinUrl}
					/>
				{/each}
			</Marquee>

			<!-- Left Gradient -->
			<div
				class="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white dark:from-background"
			></div>

			<!-- Right Gradient -->
			<div
				class="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-background"
			></div>
		</div>
	</div>
</section>
