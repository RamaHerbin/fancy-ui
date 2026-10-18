<!--
	InstallStrip — the install and import lines for the framework the visitor
	picked (shared store, so the hero switch and this one agree). Vue has no
	npm package yet: it says so and points at the source instead of printing
	a command that would fail.
-->
<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { FrameworkSwitch } from "$lib/components/site/index.js";
	import { createCopy } from "$lib/fancy-ui/_internals/clipboard.svelte.js";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import type { Framework } from "$lib/inspiration/types.js";
	import {
		PACKAGE_NAME,
		REACT_PACKAGE_NAME,
		VUE_PACKAGE_NAME,
		VUE_PACKAGE_PUBLISHED,
		VUE_PACKAGE_URL,
	} from "$lib/site.js";

	const PACKAGES: Record<Framework, string> = {
		svelte: PACKAGE_NAME,
		react: REACT_PACKAGE_NAME,
		vue: VUE_PACKAGE_NAME,
	};

	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const framework = $derived<Framework>(mounted ? store.framework : "svelte");

	const pkg = $derived(PACKAGES[framework]);
	const installable = $derived(framework !== "vue" || VUE_PACKAGE_PUBLISHED);
	const install = $derived(`pnpm add ${pkg}`);

	const clipboard = createCopy();
	let failed = $state(false);
	let failTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		clearTimeout(failTimer);
		failed = !(await clipboard.copy(install));
		if (failed) failTimer = setTimeout(() => (failed = false), 2000);
	}

	onDestroy(() => {
		clipboard.destroy();
		clearTimeout(failTimer);
	});
</script>

<div class="install" data-install>
	<FrameworkSwitch label="Install framework" />
	<div class="code fx-mono" data-install-line>
		{#if installable}
			<code><span class="prompt" aria-hidden="true">$</span> {install}</code>
			<button type="button" class="copy" onclick={copy} data-state={failed ? "failed" : undefined}>
				{clipboard.copied ? "Copied" : failed ? "Copy failed" : "Copy"}
			</button>
		{:else}
			<p class="soon">
				{pkg} — coming to npm ·
				<a href={VUE_PACKAGE_URL} target="_blank" rel="noopener noreferrer">source on GitHub ↗</a>
			</p>
		{/if}
	</div>
	<p class="import fx-mono">
		<span class="kw">import</span>
		{"{ Button }"} <span class="kw">from</span> "{pkg}";
	</p>
	<span class="sr-only" aria-live="polite"
		>{clipboard.copied ? "Copied to clipboard" : failed ? "Copy failed" : ""}</span
	>
</div>

<style>
	.install {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 16px 32px;
		padding: 24px;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.code {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		height: 56px;
		padding: 0 10px 0 18px;
		border-radius: 12px;
		font-size: 13px;
		background: var(--fx-canvas);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	code {
		flex: 1;
		font-family: var(--fx-font-mono);
		min-width: 0;
		overflow-x: auto;
		white-space: nowrap;
		color: var(--fx-ink);
	}

	.prompt {
		color: var(--fx-ink-3);
	}

	.copy {
		flex: none;
		height: 34px;
		min-width: 72px;
		padding: 0 12px;
		border-radius: 8px;
		font-family: var(--fx-font-sans);
		font-size: 13px;
		color: var(--fx-ink);
		background: var(--fx-card-raised);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		cursor: pointer;
	}

	.copy[data-state="failed"] {
		color: var(--g-amber);
	}

	.soon {
		font-size: 13px;
		color: var(--fx-ink-2);
	}

	.soon a {
		color: var(--fx-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.import {
		grid-column: 2;
		padding-left: 18px;
		font-size: 13px;
		color: var(--fx-ink-2);
		overflow-x: auto;
		white-space: nowrap;
	}

	.kw {
		color: var(--fx-ink-3);
	}

	@media (max-width: 700px) {
		.install {
			grid-template-columns: minmax(0, 1fr);
			padding: 16px;
		}
		.code {
			font-size: 12.5px;
			padding-left: 14px;
		}
		.soon {
			font-size: 12px;
		}
		.import {
			grid-column: 1;
			padding-left: 14px;
			font-size: 12.5px;
		}
	}
</style>
