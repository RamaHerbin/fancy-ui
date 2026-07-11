<script lang="ts">
	import { createSkinState, t } from "$lib/stores";

	const skinState = createSkinState();
</script>

<button
	type="button"
	onclick={skinState.toggleSkin}
	aria-pressed={skinState.isBrutal}
	aria-label={t("a11y.toggleSkin")}
	class="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 items-center gap-1.5 rounded-md border px-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
>
	<span
		aria-hidden="true"
		class="size-2.5 rounded-[3px] border-[1.5px] border-current {skinState.isBrutal
			? 'bg-[#F5B40C]'
			: 'bg-transparent'}"
	></span>
	{t("skin.brutal")}
</button>
