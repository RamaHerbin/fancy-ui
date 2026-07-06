<script lang="ts">
	import { t } from "$lib/stores";

	interface Props {
		code: string;
		lang?: string;
		showLineNumbers?: boolean;
	}

	let { code, lang = "svelte", showLineNumbers = false }: Props = $props();

	let highlighted = $state("");
	let copied = $state(false);

	let highlighterInstance: any = null;
	let loadedLangs = new Set<string>();

	$effect(() => {
		const currentCode = code;
		const currentLang = lang;
		highlighted = "";

		(async () => {
			if (!highlighterInstance) {
				const { createHighlighter } = await import("shiki");
				highlighterInstance = await createHighlighter({
					themes: ["github-dark"],
					langs: [currentLang],
				});
				loadedLangs.add(currentLang);
			} else if (!loadedLangs.has(currentLang)) {
				await highlighterInstance.loadLanguage(currentLang);
				loadedLangs.add(currentLang);
			}
			highlighted = highlighterInstance.codeToHtml(currentCode.trim(), {
				lang: currentLang,
				theme: "github-dark",
			});
		})();
	});

	async function copyCode() {
		await navigator.clipboard.writeText(code.trim());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="group relative">
	<div class="absolute top-2 right-2 z-10 flex items-center gap-2">
		{#if lang}
			<span class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40 uppercase">
				{lang}
			</span>
		{/if}
		<button
			onclick={copyCode}
			class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-white"
		>
			{copied ? t("action.copied") : t("action.copy")}
		</button>
	</div>
	{#if highlighted}
		<div
			class="overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] text-sm [&_code]:font-mono [&_pre]:p-4"
			class:line-numbers={showLineNumbers}
		>
			{@html highlighted}
		</div>
	{:else}
		<pre
			class="overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 font-mono text-sm text-white/80"><code
				>{code.trim()}</code
			></pre>
	{/if}
</div>
