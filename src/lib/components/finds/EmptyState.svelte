<script lang="ts">
	interface Props {
		view: "all" | "saved";
	}

	let { view }: Props = $props();
</script>

<div class="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center">
	<span class="block h-7 w-7 rounded-[2px] border-[1.5px]" style="border-color:var(--lp-grey-4)"
	></span>
	<p class="lp-mono text-[11px] tracking-[0.16em]" style="color:var(--lp-grey-2)">
		{view === "saved" ? "NOTHING SAVED YET" : "NO FINDS MATCH"}
	</p>
	<p class="lp-mono text-[10.5px] tracking-[0.14em]" style="color:var(--lp-grey-4)">
		{view === "saved"
			? "HOVER A CARD AND PRESS THE BOOKMARK"
			: "TRY ANOTHER GESTURE OR A SHORTER QUERY"}
	</p>
</div>
