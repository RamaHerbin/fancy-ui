<script lang="ts">
	import { flushSync } from "svelte";
	import { pixelWave, type SunPalette } from "$lib/fancy-ui/sun-switch";

	// `pixelWave` works with any trigger: here an ordinary button, with the wave
	// starting under the pointer (or from the button's centre for a keyboard press).
	const MOON: SunPalette = ["#a8dcf2", "#86aef0", "#9a8de6", "#c690dc"];

	let stage = $state<HTMLElement | null>(null);
	let night = $state(false);

	function toggle(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		if (!stage) return;
		const box = stage.getBoundingClientRect();
		const button = event.currentTarget.getBoundingClientRect();
		const keyboard = event.detail === 0;
		const x = keyboard ? button.left + button.width / 2 : event.clientX;
		const y = keyboard ? button.top + button.height / 2 : event.clientY;
		void pixelWave({
			origin: { x: x - box.left - stage.clientLeft, y: y - box.top - stage.clientTop },
			mode: "contained",
			scope: stage,
			palette: MOON,
			cell: 6,
			dot: 5,
			duration: 1100,
			apply: () => {
				night = !night;
				// Commit the DOM now: the wave reveals whatever the page shows next.
				flushSync();
			},
		});
	}
</script>

<section
	bind:this={stage}
	class="relative flex h-72 w-full max-w-xl flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border px-6 text-center {night
		? 'border-white/10 bg-[#0d1220] text-[#e6ecf7]'
		: 'border-black/10 bg-[#eef3fb] text-[#142033]'}"
>
	<p class="text-[11px] tracking-[0.2em] uppercase opacity-60">Harbour office</p>
	<h3 class="text-2xl font-semibold tracking-tight">
		{night ? "Night shift, lights on" : "Day shift, lights off"}
	</h3>
	<button
		type="button"
		onclick={toggle}
		class="rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current {night
			? 'border-white/20 hover:bg-white/10'
			: 'border-black/15 hover:bg-black/5'}"
	>
		{night ? "Switch to day" : "Switch to night"}
	</button>
</section>
