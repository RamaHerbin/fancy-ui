<script lang="ts">
	import { onMount } from "svelte";
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal/index.js";

	let isMobile = $state(false);

	function checkMobile() {
		if (typeof window !== "undefined") {
			isMobile =
				window.innerWidth < 768 ||
				/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		}
	}

	onMount(() => {
		checkMobile();
		const handleResize = () => checkMobile();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	});
</script>

{#if !isMobile}
	<BlurReveal delay={0.15} duration={0.6} class="inline-block">
		<div
			class="border-border/20 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] backdrop-blur-md transition"
			aria-label="This site aims for a low-carbon footprint"
		>
			🌱
			<span class="text-muted-foreground tracking-tight">
				Carbon&nbsp;footprint <span class="text-foreground">neutral</span>
			</span>
			<a
				href="/portfolio/carbon"
				class="text-muted-foreground/60 decoration-border/20 hover:text-muted-foreground hover:decoration-border/40 ml-1 underline underline-offset-2 transition"
			>
				Learn&nbsp;more
			</a>
		</div>
	</BlurReveal>
{:else}
	<div
		class="border-border/20 bg-muted/60 text-muted-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]"
		aria-label="This site aims for a low-carbon footprint"
	>
		🌱
		<span class="text-muted-foreground tracking-tight">
			Carbon&nbsp;footprint <span class="text-foreground">neutral</span>
		</span>
		<a
			href="/portfolio/carbon"
			class="text-muted-foreground/60 decoration-border/20 ml-1 underline underline-offset-2"
		>
			Learn&nbsp;more
		</a>
	</div>
{/if}
