<script lang="ts">
	import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "$lib/site.js";
	import { getLocale } from "$lib/stores/locale.svelte.js";

	/** Region for the codes that do not map to `<code>_<CODE>` (or are script-tagged). */
	const OG_LOCALES: Record<string, string> = {
		en: "en_US",
		ja: "ja_JP",
		ko: "ko_KR",
		"zh-Hans": "zh_CN",
		hi: "hi_IN",
		cs: "cs_CZ",
		ar: "ar_AR",
		fa: "fa_IR",
		pt: "pt_PT",
		id: "id_ID",
		tr: "tr_TR",
		pl: "pl_PL",
	};
	const ogLocale = (code: string) => OG_LOCALES[code] ?? `${code}_${code.toUpperCase()}`;

	interface Props {
		/** Full <title> text, used verbatim for og:title / twitter:title too. */
		title: string;
		description: string;
		/** Site-relative path with a leading slash, e.g. "/docs/components". */
		path: string;
		/** Site-relative path or absolute URL of the social card. */
		image?: string;
		/** Pixel size of `image`; defaults to the 1200×630 site card. */
		imageWidth?: number;
		imageHeight?: number;
		/** Alt text of `image`; defaults to "Social card for <title>". */
		imageAlt?: string;
		type?: "website" | "article";
		/** Drops the canonical link and emits robots=noindex. */
		noindex?: boolean;
	}

	let {
		title,
		description,
		path,
		image = DEFAULT_OG_IMAGE,
		imageWidth = 1200,
		imageHeight = 630,
		imageAlt,
		type = "website",
		noindex = false,
	}: Props = $props();

	// UX-only i18n: the locale is a reader preference, so there is no hreflang,
	// and it only localizes /docs; every other page's content is English.
	const locale = $derived(
		path === "/docs" || path.startsWith("/docs/") ? ogLocale(getLocale()) : ogLocale("en")
	);
	const url = $derived(absoluteUrl(path));
	const imageUrl = $derived(absoluteUrl(image));
	const alt = $derived(imageAlt ?? `Social card for ${title}`);
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
	<!-- The default /og.png and the per-component /og/<slug>.jpg are 1200×630;
	     a page passing its own image (an Inspiration poster) passes its size. -->
	<meta property="og:image:width" content={String(imageWidth)} />
	<meta property="og:image:height" content={String(imageHeight)} />
	<meta property="og:image:alt" content={alt} />
	<meta property="og:locale" content={locale} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
