<script lang="ts">
	import { AnimatedLogoCloud } from '$lib/fancy-ui/logo-cloud/index.js';

	const logos = [
		{ name: 'Angular', path: '/portfolio/Angular_Logo_SVG.svg' },
		{ name: 'Gobelins Paris', path: '/portfolio/logo-gobelins.svg' },
		{ name: 'Nvidia', path: '/portfolio/nvidia_logo.svg' },
		{ name: 'Synopsys Inc', path: '/portfolio/Synopsys_Logo.svg' },
		{ name: 'Fleur de Papier', path: '/portfolio/FleurdePapier.svg' },
		{ name: 'Ansys', path: '/portfolio/Ansys_logo_(2019).svg' }
	];
</script>

<section id="trusted" class="py-20 px-6">
	<div class="max-w-6xl mx-auto">
		<div class="text-center mb-2">
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
				They Trusted Me
			</h2>
		</div>
		<div>
			<AnimatedLogoCloud {logos} />
		</div>
	</div>
</section>
