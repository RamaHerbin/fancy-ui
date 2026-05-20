<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
		code: string;
		lang?: string;
		showLineNumbers?: boolean;
	}

	let { code, lang = "svelte", showLineNumbers = false }: Props = $props();

	let highlighted = $state("");
	let copied = $state(false);

	onMount(async () => {
		const { createHighlighter } = await import("shiki");
		const highlighter = await createHighlighter({
			themes: ["github-dark"],
			langs: [lang],
		});
		highlighted = highlighter.codeToHtml(code.trim(), {
			lang,
			theme: "github-dark",
		});
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
			class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
		>
			{copied ? "Copied!" : "Copy"}
		</button>
	</div>
	{#if highlighted}
		<div
			class="overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] text-sm [&_pre]:p-4 [&_code]:font-mono"
			class:line-numbers={showLineNumbers}
		>
			{@html highlighted}
		</div>
	{:else}
		<pre class="overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 font-mono text-sm text-white/80"><code>{code.trim()}</code></pre>
	{/if}
</div>
