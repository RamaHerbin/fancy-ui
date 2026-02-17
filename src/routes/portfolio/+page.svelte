<script lang="ts">
	import Hero from '$lib/portfolio/sections/Hero.svelte';
	import Trusted from '$lib/portfolio/sections/Trusted.svelte';
	import About from '$lib/portfolio/sections/About.svelte';
	import Projects from '$lib/portfolio/sections/Projects.svelte';
	import Testimonials from '$lib/portfolio/sections/Testimonials.svelte';
	import Passions from '$lib/portfolio/sections/Passions.svelte';
	import Contact from '$lib/portfolio/sections/Contact.svelte';
	import Footer from '$lib/portfolio/sections/Footer.svelte';
</script>

<svelte:head>
	<title>Rama Herbin - Front-End & UI Engineer</title>
	<meta
		name="description"
		content="Portfolio of Rama Herbin, Front-End & UI Engineer at Ansys by Synopsys. Building intuitive, high-performance interfaces."
	/>
	<meta property="og:title" content="Rama Herbin - Front-End & UI Engineer" />
	<meta
		property="og:description"
		content="Portfolio of Rama Herbin, Front-End & UI Engineer at Ansys by Synopsys."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<div class="min-h-screen">
	<Hero />
	<Trusted />
	<About />
	<Projects />
	<Testimonials />
	<Passions />
	<Contact />
	<Footer />
</div>
