<script lang="ts">
	import { t } from "$lib/stores";

	interface Props {
		code: string;
		lang?: string;
		showLineNumbers?: boolean;
		/** Set false for a pane that is mounted but not on screen: the plain `<pre>` still renders,
		 * but no highlighter is created until it becomes active. */
		active?: boolean;
	}

	let { code, lang = "svelte", showLineNumbers = false, active = true }: Props = $props();

	let highlighted = $state("");
	let copied = $state(false);

	let highlighterInstance: any = null;
	let loadedLangs = new Set<string>();

	$effect(() => {
		const currentCode = code;
		const currentLang = lang;
		const isActive = active;
		highlighted = "";

		if (!isActive) return;

		let stale = false;

		(async () => {
			if (!highlighterInstance) {
				const { createHighlighter } = await import("shiki");
				highlighterInstance = await createHighlighter({
					themes: ["github-dark", "github-light"],
					langs: [currentLang],
				});
				loadedLangs.add(currentLang);
			} else if (!loadedLangs.has(currentLang)) {
				await highlighterInstance.loadLanguage(currentLang);
				loadedLangs.add(currentLang);
			}
			if (stale) return;
			highlighted = highlighterInstance.codeToHtml(currentCode.trim(), {
				lang: currentLang,
				themes: { light: "github-light", dark: "github-dark" },
				defaultColor: false,
			});
		})();

		return () => {
			stale = true;
		};
	});

	async function copyCode() {
		await navigator.clipboard.writeText(code.trim());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="docs-code group relative">
	<div class="docs-code-tools absolute top-2 right-2 z-10 flex items-center gap-2">
		{#if lang}
			<span
				class="retro-code-lang rounded bg-(--code-chip-bg) px-2 py-0.5 text-[10px] font-medium text-(--code-fg-muted) uppercase"
			>
				{lang}
			</span>
		{/if}
		<button
			onclick={copyCode}
			class="retro-copy docs-copy rounded-md border border-(--code-border) bg-(--code-chip-bg) px-2 py-1 text-xs text-(--code-fg-muted) opacity-0 transition-opacity group-hover:opacity-100 hover:text-(--code-fg)"
		>
			{copied ? t("action.copied") : t("action.copy")}
		</button>
	</div>
	{#if highlighted}
		<div
			dir="ltr"
			class="docs-code-surface overflow-x-auto rounded-lg border border-(--code-border) bg-(--code-bg) text-sm [&_code]:font-mono [&_pre]:p-4"
			class:line-numbers={showLineNumbers}
		>
			{@html highlighted}
		</div>
	{:else}
		<pre
			dir="ltr"
			class="docs-code-surface overflow-x-auto rounded-lg border border-(--code-border) bg-(--code-bg) p-4 font-mono text-sm text-(--code-fg)"><code
				>{code.trim()}</code
			></pre>
	{/if}
</div>
