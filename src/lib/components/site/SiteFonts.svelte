<!--
	The three landing typefaces (Geist, Geist Mono, Instrument Serif), loaded
	once per page that wears the 13a art direction — the home page through
	HeroSection, and the inspiration pages directly. Self-hosted from
	static/fonts/ (SIL OFL, licences alongside): the third-party font stylesheet
	was the home page's largest render-blocking request, and the H1 is its LCP
	element, so the two faces it paints with are preloaded. Duplicate <link>s in
	<svelte:head> are harmless: the browser dedupes by href.

	The @font-face rules below are global by nature (Svelte never scopes
	at-rules), so they ship with whichever page mounts this component.

	`serif` opts into preloading the italic serif. Only the home page paints its
	LCP heading with it; elsewhere the face is declared but rarely used, and a
	preload the page never consumes costs bandwidth and a console warning.
-->
<script lang="ts">
	let { serif = false }: { serif?: boolean } = $props();
</script>

<svelte:head>
	<link
		rel="preload"
		href="/fonts/Geist-Variable.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	{#if serif}
		<link
			rel="preload"
			href="/fonts/InstrumentSerif-Italic.woff2"
			as="font"
			type="font/woff2"
			crossorigin="anonymous"
		/>
	{/if}
</svelte:head>

<style>
	@font-face {
		font-family: "Geist";
		font-style: normal;
		font-weight: 100 900;
		font-display: swap;
		src: url("/fonts/Geist-Variable.woff2") format("woff2");
	}

	@font-face {
		font-family: "Geist Mono";
		font-style: normal;
		font-weight: 100 900;
		font-display: swap;
		src: url("/fonts/GeistMono-Variable.woff2") format("woff2");
	}

	@font-face {
		font-family: "Instrument Serif";
		font-style: normal;
		font-weight: 400;
		font-display: swap;
		src: url("/fonts/InstrumentSerif-Regular.woff2") format("woff2");
	}

	@font-face {
		font-family: "Instrument Serif";
		font-style: italic;
		font-weight: 400;
		font-display: swap;
		src: url("/fonts/InstrumentSerif-Italic.woff2") format("woff2");
	}
</style>
