<script lang="ts">
	import { AnimatedLogoCloud } from "$lib/fancy-ui/logo-cloud/index.js";

	const logos = [
		{ name: "Angular", path: "/portfolio/Angular_Logo_SVG.svg" },
		{ name: "Gobelins Paris", path: "/portfolio/logo-gobelins.svg" },
		{ name: "Nvidia", path: "/portfolio/nvidia_logo.svg" },
		{ name: "Synopsys Inc", path: "/portfolio/Synopsys_Logo.svg" },
		{ name: "Fleur de Papier", path: "/portfolio/FleurdePapier.svg" },
		{ name: "Ansys", path: "/portfolio/Ansys_logo_(2019).svg" },
	];
</script>

<section id="trusted" class="px-6 py-20">
	<div class="mx-auto max-w-6xl">
		<div class="mb-2 text-center">
			<h2 class="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
				They Trusted Me
			</h2>
		</div>
		<div>
			<AnimatedLogoCloud {logos} />
		</div>
	</div>
</section>
