<script lang="ts">
	import { t } from "$lib/stores";
	import { tc } from "$lib/components/docs/chrome-i18n.js";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import { SITE_URL, SITE_NAME } from "$lib/site.js";
	import { getComponent } from "$lib/fancy-ui/registry.js";
	import { recipeSources } from "$lib/docs/recipes/markdown.js";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import { onMount } from "svelte";
	import type { Component } from "svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let recipe = $derived(data.recipe);
	let sources = $derived(recipeSources(recipe.slug));
	let path = $derived(`/docs/recipes/${recipe.slug}`);
	let pageUrl = $derived(`${SITE_URL}${path}`);

	// The live demos are real components, rendered during prerender too.
	const demos = import.meta.glob("/src/lib/components/docs/recipes/*/Demo.svelte", {
		eager: true,
	}) as Record<string, { default: Component }>;
	let Demo = $derived(
		demos[`/src/lib/components/docs/recipes/${recipe.slug}/Demo.svelte`]?.default
	);

	// Read the stored framework after mount so the prerendered markup matches the first client render.
	const frameworkState = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const framework = $derived(mounted ? frameworkState.framework : "svelte");
	const code = $derived(sources[framework]);
	const lang = $derived(framework === "svelte" ? "svelte" : framework === "react" ? "tsx" : "vue");

	let tab = $state<"preview" | "code">("preview");

	let copied = $state(false);
	async function copyMarkdown() {
		const res = await fetch(`${path}.md`);
		if (!res.ok) return;
		await navigator.clipboard.writeText(await res.text());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	let articleLd = $derived({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: recipe.title,
		description: recipe.summary,
		url: pageUrl,
		isPartOf: { "@id": `${SITE_URL}/#website` },
		author: { "@type": "Organization", name: SITE_NAME },
		publisher: { "@type": "Organization", name: SITE_NAME },
		encoding: {
			"@type": "MediaObject",
			encodingFormat: "text/markdown",
			contentUrl: `${pageUrl}.md`,
		},
	});
</script>

<svelte:head>
	<link rel="alternate" type="text/markdown" href="{path}.md" title="{recipe.title} (Markdown)" />
</svelte:head>

<Seo
	title="{recipe.title} recipe — {SITE_NAME}"
	description={recipe.summary}
	{path}
	type="article"
/>
<JsonLd data={articleLd} />

<div class="max-w-4xl">
	<nav aria-label={t("a11y.breadcrumb")} class="mb-4">
		<ol class="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
			<li><a href="/" class="hover:text-foreground transition-colors">{t("nav.home")}</a></li>
			<li aria-hidden="true" class="opacity-40 select-none">/</li>
			<li>{t("nav.recipes")}</li>
			<li aria-hidden="true" class="opacity-40 select-none">/</li>
			<li class="text-foreground font-medium" aria-current="page">{recipe.title}</li>
		</ol>
	</nav>

	<div class="mb-2 flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-foreground text-3xl font-bold" id="overview">{recipe.title}</h1>
		<div class="flex items-center gap-2 text-xs">
			<button
				type="button"
				onclick={copyMarkdown}
				data-markdown-copy
				class="border-border text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors"
			>
				{copied ? t("action.copied") : t("comp.copyMarkdown")}
			</button>
			<a
				href="{path}.md"
				data-markdown-link
				class="text-muted-foreground hover:text-foreground font-mono underline-offset-2 hover:underline"
				>.md</a
			>
		</div>
	</div>
	<p class="text-muted-foreground mb-6">{recipe.summary}</p>

	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="preview">{t("comp.preview")}</h2>
		<!-- Not ComponentPreview: that one unmounts the demo off-tab, and a recipe demo has to stay mounted
		     while the Code tab is open so pending toasts (an undo window, a retry) keep running. The retro
		     skin hooks and the bounded code pane are kept to match it. -->
		<div class="retro-window-shadow">
			<div class="retro-window border-border overflow-hidden rounded-lg border">
				<div class="retro-tabbar border-border flex border-b px-1">
					<button
						type="button"
						onclick={() => (tab = "preview")}
						class="px-4 py-2.5 text-sm font-medium transition-colors {tab === 'preview'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{t("comp.preview")}
					</button>
					<button
						type="button"
						onclick={() => (tab = "code")}
						class="px-4 py-2.5 text-sm font-medium transition-colors {tab === 'code'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{t("comp.code")}
					</button>
				</div>
				<div data-thumb-stage class="retro-stage p-6" hidden={tab !== "preview"}>
					{#if Demo}
						<Demo />
					{/if}
				</div>
				<div hidden={tab !== "code"}>
					<div class="max-h-[500px] overflow-auto">
						<CodeBlock {code} {lang} active={tab === "code"} />
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="mb-10">
		<h2 class="text-foreground mb-3 text-xl font-semibold" id="steps">{tc("recipes.steps")}</h2>
		<ol class="text-foreground/90 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
			{#each recipe.steps as step (step)}
				<li>{step}</li>
			{/each}
		</ol>
	</section>

	<section class="mb-10">
		<h2 class="text-foreground mb-3 text-xl font-semibold" id="pitfalls">
			{tc("recipes.pitfalls")}
		</h2>
		<ul class="text-foreground/90 list-disc space-y-2 pl-5 text-sm leading-relaxed">
			{#each recipe.pitfalls as pitfall (pitfall)}
				<li>{pitfall}</li>
			{/each}
		</ul>
	</section>

	<section class="mb-10">
		<h2 class="text-foreground mb-3 text-xl font-semibold" id="components">
			{tc("recipes.componentsUsed")}
		</h2>
		<ul class="flex flex-wrap gap-2 text-sm">
			{#each recipe.components as slug (slug)}
				<li>
					<a
						href="/docs/components/{slug}"
						class="border-border hover:bg-accent rounded-md border px-2.5 py-1 transition-colors"
						>{getComponent(slug)?.name ?? slug}</a
					>
				</li>
			{/each}
		</ul>
	</section>
</div>
