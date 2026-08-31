<script lang="ts">
	import { t, tCategory, componentDocTitle, createSkinState } from "$lib/stores";
	// The group badge composes its key at runtime, so the cast needs the key union.
	import type { MessageKey } from "$lib/i18n/messages/en.js";
	import PropsTable from "$lib/components/docs/PropsTable.svelte";
	import InstallBlock from "$lib/components/docs/InstallBlock.svelte";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import DemoRenderer, {
		PREVIEW_EXAMPLE,
		skipDirectRender,
		defaultProps,
	} from "$lib/components/docs/DemoRenderer.svelte";
	import ExamplesSection from "$lib/components/docs/ExamplesSection.svelte";
	import Breadcrumbs from "$lib/components/docs/Breadcrumbs.svelte";
	import RelatedComponents from "$lib/components/docs/RelatedComponents.svelte";
	import PrevNextNav from "$lib/components/docs/PrevNextNav.svelte";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";
	import { hasSoundProp } from "$lib/fancy-ui/registry.js";
	import Seo from "$lib/components/Seo.svelte";
	import JsonLd from "$lib/components/JsonLd.svelte";
	import { SITE_URL, SITE_NAME } from "$lib/site.js";
	import type { PageData } from "./$types";

	const REPO_URL = "https://github.com/RamaHerbin/fancy-ui";

	let { data }: { data: PageData } = $props();

	let component = $derived(data.component);
	let soundCapable = $derived(hasSoundProp(component.slug));

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");

	let sourceUrl = $derived(
		`https://github.com/ramaherbin/fancy-ui/tree/main/src/lib/fancy-ui/${component.slug}`
	);
	let path = $derived(`/docs/components/${component.slug}`);
	let pageUrl = $derived(`${SITE_URL}${path}`);
	let ogImage = $derived(`/og/${component.slug}.jpg`);

	// Registry descriptions are written as sentence fragments without terminal
	// punctuation, so close the sentence before appending the shared suffix.
	let metaDescription = $derived.by(() => {
		const base = component.description.trim();
		const sentence = /[.!?]$/.test(base) ? base : `${base}.`;
		return `${sentence} Svelte 5 component — live preview, props and copy-paste examples.`;
	});

	let breadcrumbLd = $derived({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
			{ "@type": "ListItem", position: 2, name: "Components", item: `${SITE_URL}/docs/components` },
			{ "@type": "ListItem", position: 3, name: component.name, item: pageUrl },
		],
	});

	let articleLd = $derived({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: component.name,
		description: metaDescription,
		url: pageUrl,
		isPartOf: { "@id": `${SITE_URL}/#website` },
		author: { "@type": "Organization", name: SITE_NAME },
		publisher: { "@type": "Organization", name: SITE_NAME },
		image: `${SITE_URL}${ogImage}`,
		about: {
			"@type": "SoftwareSourceCode",
			name: component.name,
			programmingLanguage: "Svelte",
			codeRepository: REPO_URL,
			license: `${REPO_URL}/blob/main/LICENSE`,
		},
	});

	let basicUsageCode = $derived(`<script lang="ts">
  import { ${component.name} } from 'fancy-ui-svelte';
<\/script>

<${component.name} />`);

	// Raw source of every docs example, so the Code tab can mirror whatever the Preview
	// actually renders (a PREVIEW_EXAMPLE override, a BasicUsage.svelte for skipDirectRender
	// slugs, or the generic snippet enriched with defaultProps) instead of a generic
	// single-tag usage that often can't even render on its own (e.g. missing required props).
	const rawExamples = import.meta.glob("$lib/components/docs/examples/**/*.svelte", {
		query: "?raw",
		import: "default",
		eager: true,
	}) as Record<string, string>;

	// Serializes a props object as Svelte attributes: strings are quoted, everything else
	// (numbers, booleans, arrays, objects) is wrapped in braces as a JS expression.
	function serializeProps(props: Record<string, any>): string {
		return Object.entries(props)
			.map(([key, value]) =>
				typeof value === "string" ? `${key}="${value}"` : `${key}={${JSON.stringify(value)}}`
			)
			.join(" ");
	}

	// Docs examples import via the repo-internal $lib path; consumers must import the
	// package, so raw example source is rewritten before display.
	function toConsumerImports(src: string): string {
		return src.replace(/(["'])\$lib\/fancy-ui(?:\/[^"']*)?\1/g, "$1fancy-ui-svelte$1");
	}

	let previewCode = $derived.by(() => {
		const slug = component.slug;

		// 1. Slug's Preview is overridden to a specific example — show that example's source.
		const example = PREVIEW_EXAMPLE[slug];
		if (example) {
			const src = rawExamples[`/src/lib/components/docs/examples/${slug}/${example}.svelte`];
			if (src) return toConsumerImports(src.trim());
		}

		// 2. Slug needs too much setup to render directly — the Preview shows BasicUsage.svelte,
		// so mirror that same source in the Code tab.
		if (skipDirectRender.has(slug)) {
			const src = rawExamples[`/src/lib/components/docs/examples/${slug}/BasicUsage.svelte`];
			if (src) return toConsumerImports(src.trim());
		}

		// 3. Slug renders directly with defaultProps — enrich the generic snippet with them so
		// the Code tab reproduces what the Preview actually renders.
		const props = defaultProps[slug];
		if (props && Object.keys(props).length > 0) {
			const attrs = serializeProps(props);
			return `<script lang="ts">
  import { ${component.name} } from 'fancy-ui-svelte';
<\/script>

<${component.name} ${attrs} />`;
		}

		// 4. Fallback: generic single-tag usage.
		return basicUsageCode;
	});

	let previewTab = $state<"preview" | "code">("preview");
</script>

<Seo
	title={componentDocTitle(component.name, component.category)}
	description={metaDescription}
	{path}
	image={ogImage}
	type="article"
/>
<JsonLd data={breadcrumbLd} />
<JsonLd data={articleLd} />

<div class="max-w-4xl">
	<Breadcrumbs current={component.name} />

	<!-- Header -->
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<span
			class="retro-tag bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
			data-category={component.category}
		>
			{tCategory(component.category)}
		</span>
		<span
			class="rounded-full px-2.5 py-0.5 text-xs font-medium {component.group === 'core'
				? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
				: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}"
		>
			{t(`group.${component.group}` as MessageKey)}
		</span>
		{#if component.status === "done"}
			<span
				class="retro-tag retro-tag-stable rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
			>
				{t("status.stable")}
			</span>
		{:else if component.status === "in-progress"}
			<span
				class="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
			>
				{t("status.inProgress")}
			</span>
		{/if}
	</div>

	<h1 class="text-foreground mb-2 text-3xl font-bold" id="overview">{component.name}</h1>
	<p class="text-muted-foreground mb-6">{component.description}</p>

	<!-- ═══ PREVIEW ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="preview">{t("comp.preview")}</h2>
		<div class="retro-window-shadow">
			<div class="retro-window border-border overflow-hidden rounded-lg border">
				{#if isRetro}
					<!-- Retro window titlebar -->
					<div class="retro-preview-bar">
						<span class="retro-pixel-logo" aria-hidden="true">
							<span></span><span></span><span></span><span></span>
						</span>
						<span class="retro-preview-title">{t("comp.preview")} — {component.name}</span>
						<span class="retro-winctl retro-winctl-min" aria-hidden="true"></span>
						<span class="retro-winctl retro-winctl-max" aria-hidden="true"></span>
						<span class="retro-winctl retro-winctl-close" aria-hidden="true"></span>
					</div>
				{/if}
				<!-- Tabs -->
				<div class="retro-tabbar border-border flex items-center justify-between border-b px-1">
					<div class="flex">
						<button
							onclick={() => (previewTab = "preview")}
							class="px-4 py-2.5 text-sm font-medium transition-colors {previewTab === 'preview'
								? 'border-foreground text-foreground border-b-2'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{t("comp.preview")}
						</button>
						<button
							onclick={() => (previewTab = "code")}
							class="px-4 py-2.5 text-sm font-medium transition-colors {previewTab === 'code'
								? 'border-foreground text-foreground border-b-2'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{t("comp.code")}
						</button>
					</div>
					{#if soundCapable}
						<!-- The header carries the same switch, but it is hidden below `sm` — and a visitor
						     reading about a component that makes sound should not have to hunt for it. -->
						<SoundToggle size="sm" label={t("a11y.sound")} class="mr-2" />
					{/if}
				</div>

				<!-- Content -->
				{#if previewTab === "preview"}
					<div
						class="retro-stage bg-background relative flex min-h-[300px] items-center justify-center overflow-hidden p-8"
					>
						<DemoRenderer slug={component.slug} />
					</div>
				{/if}
				<!-- The code pane is always mounted, only hidden, so the usage snippet is in the
				     prerendered HTML instead of appearing solely after a client-side tab switch.
				     Highlighting still waits for the tab to be opened. -->
				<div class="max-h-[500px] overflow-auto" hidden={previewTab !== "code"}>
					<CodeBlock code={previewCode} lang="svelte" active={previewTab === "code"} />
				</div>
			</div>
		</div>
	</section>

	<!-- ═══ INSTALLATION ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="installation">
			{t("comp.installation")}
		</h2>
		<InstallBlock componentImport={"{ " + component.name + " }"} />
	</section>

	<!-- ═══ USAGE ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="usage">{t("comp.usage")}</h2>
		<CodeBlock code={basicUsageCode} lang="svelte" />
	</section>

	<!-- ═══ EXAMPLES ═══ -->
	<ExamplesSection slug={component.slug} />

	<!-- ═══ PROPS ═══ -->
	{#if component.props && component.props.length > 0}
		<section class="mb-10">
			<h2 class="text-foreground mb-4 text-xl font-semibold" id="props">{t("comp.props")}</h2>
			<div class="retro-props border-border overflow-hidden rounded-lg border">
				<PropsTable props={component.props} />
			</div>
		</section>
	{/if}

	<!-- ═══ SLOTS ═══ -->
	{#if component.slots && component.slots.length > 0}
		<section class="mb-10">
			<h2 class="text-foreground mb-4 text-xl font-semibold" id="slots">{t("comp.slots")}</h2>
			<div class="border-border overflow-hidden rounded-lg border">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-foreground px-4 py-3 font-semibold">{t("table.slot")}</th>
							<th class="text-foreground px-4 py-3 font-semibold">{t("table.description")}</th>
						</tr>
					</thead>
					<tbody>
						{#each component.slots as slot}
							<tr class="border-border border-b last:border-0">
								<td class="px-4 py-3">
									<code
										class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-medium text-purple-600 dark:text-purple-400"
									>
										{slot.name}
									</code>
								</td>
								<td class="text-muted-foreground px-4 py-3 text-xs">{slot.description}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- ═══ LINKS ═══ -->
	<section class="mb-10">
		<h2 class="text-foreground mb-4 text-xl font-semibold" id="links">{t("comp.links")}</h2>
		<div class="flex flex-wrap gap-3">
			<a
				href={sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="retro-btn border-border text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
					/>
				</svg>
				{t("comp.sourceCode")}
			</a>
			{#if component.credits && component.credits.length > 0}
				{#each component.credits as credit}
					{#if credit.url}
						<a
							href={credit.url}
							target="_blank"
							rel="noopener noreferrer"
							class="retro-btn border-border text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
						>
							{t("comp.inspiredBy")}
							{credit.source}
						</a>
					{/if}
				{/each}
			{/if}
		</div>
	</section>

	<!-- ═══ RELATED ═══ -->
	<RelatedComponents {component} />

	<PrevNextNav slug={component.slug} />
</div>
