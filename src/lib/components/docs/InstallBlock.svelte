<script lang="ts">
	import { onMount } from "svelte";
	import { t } from "$lib/stores";
	import FrameworkSwitch from "$lib/components/site/FrameworkSwitch.svelte";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import type { Framework } from "$lib/inspiration/types.js";

	interface Variant {
		framework: Framework;
		package: string;
		importLine: string | null;
		installLine: string | null;
		note: string | null;
		availability?: "available" | "source-only" | "unavailable";
	}

	interface Props {
		packageName?: string;
		componentImport?: string;
		/** Per-framework package and import; adds a framework switch when given. */
		variants?: Variant[];
	}

	let { packageName = "fancy-ui-svelte", componentImport = "", variants }: Props = $props();

	let activeTab = $state<"pnpm" | "npm" | "bun">("pnpm");
	let copied = $state(false);

	// The framework store hydrates from localStorage; read it after mount so the
	// prerendered markup (Svelte) matches the first client render.
	const frameworkState = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const variant = $derived.by(() => {
		if (!variants?.length) return null;
		const framework = mounted ? frameworkState.framework : "svelte";
		return variants.find((v) => v.framework === framework) ?? null;
	});

	const pkg = $derived(variant ? variant.package : packageName);
	const installable = $derived(!variant || variant.installLine !== null);
	// Server notes are English; the two non-available states have catalog strings.
	const note = $derived.by(() => {
		if (!variant || installable) return null;
		return variant.importLine ? t("install.sourceOnly") : t("install.unavailable");
	});

	const commands = $derived({
		pnpm: `pnpm add ${pkg}`,
		npm: `npm install ${pkg}`,
		bun: `bun add ${pkg}`,
	});

	async function copyCommand() {
		await navigator.clipboard.writeText(commands[activeTab]);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="docs-install rounded-lg border border-(--code-border) bg-(--code-bg)">
	{#if variants?.length}
		<!-- The switch is drawn with the site shell's tokens; map them onto the
		     docs code tokens so it follows the docs theme and skin. -->
		<div
			class="flex items-center gap-3 border-b border-(--code-border) px-4 py-2.5"
			style="--fx-ink: var(--code-fg); --fx-ink-2: var(--code-fg); --fx-ink-3: var(--code-fg-muted); --fx-card-raised: var(--code-chip-bg); --fx-hairline: var(--code-border); --fx-hairline-strong: var(--code-fg-muted)"
		>
			<FrameworkSwitch size="sm" label={t("install.framework")} class="docs-install-fw" />
		</div>
	{/if}
	{#if installable}
		<!-- Tabs -->
		<div class="retro-pmtabs flex border-b border-(--code-border)">
			{#each ["pnpm", "npm", "bun"] as const as tab}
				<button
					onclick={() => (activeTab = tab)}
					class="px-4 py-2 text-xs font-medium transition-colors {activeTab === tab
						? 'border-b-2 border-(--code-fg) text-(--code-fg)'
						: 'text-(--code-fg-muted) hover:text-(--code-fg)'}"
				>
					{tab}
				</button>
			{/each}
			<div class="flex flex-1 justify-end p-1.5">
				<button
					onclick={copyCommand}
					class="retro-copy docs-copy rounded px-2 py-1 text-xs text-(--code-fg-muted) transition-colors hover:bg-(--code-chip-bg) hover:text-(--code-fg)"
				>
					{copied ? t("action.copied") : t("action.copy")}
				</button>
			</div>
		</div>
		<!-- Command -->
		<div class="docs-install-cmd p-4 font-mono text-sm text-(--code-cmd)">
			<span class="docs-install-pm">{activeTab}</span>{commands[activeTab].slice(activeTab.length)}
		</div>
	{:else if note}
		<p class="docs-install-note p-4 text-sm text-(--code-fg-muted)">{note}</p>
	{/if}
	<!-- Import -->
	{#if variant}
		{#if variant.importLine}
			<div class="border-t border-(--code-border) p-4 font-mono text-sm">
				<span class="text-(--code-fg)">{variant.importLine}</span>
			</div>
		{/if}
	{:else if componentImport}
		<div class="border-t border-(--code-border) p-4 font-mono text-sm">
			<span class="text-(--code-kw)">import</span>
			<span class="text-(--code-fg)"> {componentImport} </span>
			<span class="text-(--code-kw)">from</span>
			<span class="text-(--code-str)"> '{packageName}'</span>
		</div>
	{/if}
</div>
