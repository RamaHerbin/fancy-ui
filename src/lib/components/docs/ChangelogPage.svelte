<script lang="ts">
	import { onMount, tick } from "svelte";
	import { t } from "$lib/stores";
	import { createFrameworkState, isFramework } from "$lib/stores/framework.svelte.js";
	import { parseChangelog } from "./changelog-data.js";

	import { packageIdForAnchor, type ChangelogPackage } from "./changelog-packages.js";

	/** Pass `packages` for a tabbed view (one changelog per package), or `raw` for one file. */
	let { raw, packages }: { raw?: string; packages?: ChangelogPackage[] } = $props();

	// The tab is the site's framework choice (package ids are framework names), read
	// after mount so the prerendered Svelte list and the first client render agree.
	const frameworkState = createFrameworkState();
	let mounted = $state(false);
	const tabs = $derived(packages && packages.length > 1 ? packages : null);
	const active = $derived(
		packages?.find((p) => mounted && p.id === frameworkState.framework) ??
			packages?.[0] ??
			undefined
	);
	const versions = $derived(
		active
			? parseChangelog(active.raw, active.id === packages?.[0]?.id ? "" : active.id)
			: parseChangelog(raw ?? "")
	);

	const uid = $props.id();
	const tabId = (id: string) => `${uid}-tab-${id}`;
	const panelId = `${uid}-panel`;

	function select(id: string) {
		if (isFramework(id)) frameworkState.set(id);
	}

	async function onTabKeydown(event: KeyboardEvent) {
		if (!tabs) return;
		const i = tabs.findIndex((p) => p.id === active?.id);
		let next = -1;
		if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
		else if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
		else if (event.key === "Home") next = 0;
		else if (event.key === "End") next = tabs.length - 1;
		if (next < 0) return;
		event.preventDefault();
		select(tabs[next].id);
		await tick();
		document.getElementById(tabId(tabs[next].id))?.focus();
	}

	onMount(() => {
		mounted = true;
		// A deep link to a release of another package opens that package's list first.
		const hash = window.location.hash;
		const id = packageIdForAnchor(hash);
		if (!id || !packages?.some((p) => p.id === id)) return;
		if (frameworkState.framework !== id) select(id);
		void tick().then(() => {
			const target = document.getElementById(decodeURIComponent(hash.slice(1)));
			if (target && typeof target.scrollIntoView === "function") target.scrollIntoView();
		});
	});

	const kindKeys = {
		"Major Changes": "changelog.major",
		"Minor Changes": "changelog.minor",
		"Patch Changes": "changelog.patch",
	} as const;

	function kindLabel(kind: string): string {
		const key = kindKeys[kind as keyof typeof kindKeys];
		return key ? t(key) : kind;
	}
</script>

<div class="changelog">
	<h1>{t("changelog.title")}</h1>
	<p class="lead">{t("changelog.lead")}</p>

	{#if tabs}
		<div
			class="tabs"
			role="tablist"
			aria-label={t("changelog.title")}
			tabindex="-1"
			onkeydown={onTabKeydown}
		>
			{#each tabs as p (p.id)}
				<button
					type="button"
					role="tab"
					class="tab"
					id={tabId(p.id)}
					aria-controls={panelId}
					aria-selected={p.id === active?.id}
					tabindex={p.id === active?.id ? 0 : -1}
					onclick={() => select(p.id)}>{p.name}</button
				>
			{/each}
		</div>
	{/if}

	<div
		id={panelId}
		role={tabs ? "tabpanel" : undefined}
		aria-labelledby={tabs && active ? tabId(active.id) : undefined}
	>
		{#each versions as v, i (v.anchor)}
			<section class="release">
				<div class="release-head">
					<h2 id={v.anchor}>{v.version}</h2>
					{#if i === 0}<span class="latest">{t("changelog.latest")}</span>{/if}
					{#if v.date}<span class="date">{v.date}</span>{/if}
				</div>
				{#each v.sections as section, j (j)}
					{#if section.kind}
						<span class="kind">{kindLabel(section.kind)}</span>
					{/if}
					<!-- Release notes are generated English prose; keep them LTR under RTL locales. -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitized in changelog-data -->
					<div class="body" dir="ltr">{@html section.html}</div>
				{/each}
			</section>
		{/each}
	</div>
</div>

<style>
	.changelog {
		max-width: 840px;
	}

	.changelog h1 {
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--foreground);
		margin: 0 0 1rem;
		scroll-margin-top: 5rem;
	}

	.changelog p.lead {
		font-size: 19px;
		line-height: 1.5;
		max-width: 640px;
		color: var(--muted-foreground);
		margin: 0 0 40px;
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 0 32px;
	}

	.changelog .tab {
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted-foreground);
		border-radius: 999px;
		padding: 6px 14px;
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
	}

	.changelog .tab[aria-selected="true"] {
		background: var(--muted);
		color: var(--foreground);
		border-color: color-mix(in oklch, var(--foreground) 30%, var(--border));
	}

	.changelog .tab:focus-visible {
		outline: 2px solid var(--ring, var(--primary));
		outline-offset: 2px;
	}

	.release + .release {
		margin-top: 3rem;
	}

	.release-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}

	/* doc-prose globals compile to (0,2,1); every colliding override here is two
	   levels deep so it wins on specificity, not on bundle order. */
	.changelog .release h2 {
		font-size: 1.6rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.25;
		color: var(--foreground);
		margin: 0;
		padding: 0;
		border: none;
		scroll-margin-top: 5rem;
		font-variant-numeric: tabular-nums;
	}

	.latest {
		align-self: center;
		border: 1px solid color-mix(in oklch, var(--primary) 40%, transparent);
		background: color-mix(in oklch, var(--primary) 12%, transparent);
		color: var(--primary);
		border-radius: 999px;
		padding: 2px 10px;
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.date {
		font-size: 13px;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.changelog .kind {
		display: inline-flex;
		margin-top: 1.25rem;
		border: 1px solid var(--border);
		background: var(--muted);
		color: var(--muted-foreground);
		border-radius: 6px;
		padding: 2px 8px;
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.changelog .body {
		font-size: 14.5px;
		line-height: 1.65;
		color: var(--muted-foreground);
	}
</style>
