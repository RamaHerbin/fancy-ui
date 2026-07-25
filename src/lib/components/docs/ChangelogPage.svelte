<script lang="ts">
	import { t } from "$lib/stores";
	import { parseChangelog } from "./changelog-data.js";

	let { raw }: { raw: string } = $props();

	const versions = $derived(parseChangelog(raw));

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
