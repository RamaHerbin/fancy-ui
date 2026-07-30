<script lang="ts">
	import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "$lib/site.js";

	interface Props {
		/** Full <title> text, used verbatim for og:title / twitter:title too. */
		title: string;
		description: string;
		/** Site-relative path with a leading slash, e.g. "/docs/components". */
		path: string;
		/** Site-relative path or absolute URL of the social card. */
		image?: string;
		type?: "website" | "article";
		/** Drops the canonical link and emits robots=noindex. */
		noindex?: boolean;
	}

	let {
		title,
		description,
		path,
		image = DEFAULT_OG_IMAGE,
		type = "website",
		noindex = false,
	}: Props = $props();

	const url = $derived(absoluteUrl(path));
	const imageUrl = $derived(absoluteUrl(image));
	const imageAlt = $derived(`Social card for ${title}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />

	{#if noindex}
		<meta name="robots" content="noindex" />
	{:else}
		<link rel="canonical" href={url} />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={imageUrl} />
	<!-- Every card this site serves is 1200×630: the default /og.png and the
	     per-component /og/<slug>.jpg alike, so the dimensions are constant. -->
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:locale" content="en_US" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
