<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = "", children }: Props = $props();

	let isPointerInside = $state(false);
	let refElement: HTMLDivElement;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	let glare = $state({ x: 50, y: 50 });
	let background = $state({ x: 50, y: 50 });
	let rotate = $state({ x: 0, y: 0 });

	let cssVars = $derived(
		`--m-x:${glare.x}%;--m-y:${glare.y}%;--r-x:${rotate.x}deg;--r-y:${rotate.y}deg;--bg-x:${background.x}%;--bg-y:${background.y}%;--duration:300ms;--foil-size:100%;--opacity:0;--radius:48px;--easing:ease;--transition:var(--duration) var(--easing);`
	);

	function handlePointerMove(event: PointerEvent) {
		const rotateFactor = 0.4;
		const rect = refElement?.getBoundingClientRect();
		if (rect) {
			const position = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
			const percentage = {
				x: (100 / rect.width) * position.x,
				y: (100 / rect.height) * position.y,
			};
			const delta = {
				x: percentage.x - 50,
				y: percentage.y - 50,
			};
			background.x = 50 + percentage.x / 4 - 12.5;
			background.y = 50 + percentage.y / 3 - 16.67;
			rotate.x = -(delta.x / 3.5) * rotateFactor;
			rotate.y = (delta.y / 2) * rotateFactor;
			glare.x = percentage.x;
			glare.y = percentage.y;
		}
	}

	function handlePointerEnter() {
		isPointerInside = true;
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			if (isPointerInside && refElement) {
				refElement.style.setProperty("--duration", "0s");
			}
		}, 300);
	}

	function handlePointerLeave() {
		isPointerInside = false;
		if (timeoutId) clearTimeout(timeoutId);
		if (refElement) {
			refElement.style.removeProperty("--duration");
			rotate = { x: 0, y: 0 };
		}
	}
</script>

<div
	bind:this={refElement}
	class="glare-container relative isolate [aspect-ratio:17/21] w-[320px] transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform [contain:layout_style] [perspective:600px]"
	style={cssVars}
	onpointermove={handlePointerMove}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
>
	<div
		class="grid h-full origin-center [transform:rotateY(var(--r-x))_rotateX(var(--r-y))] overflow-hidden rounded-lg border border-slate-800 transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform hover:filter-none hover:[--duration:200ms] hover:[--easing:linear] hover:[--opacity:0.6]"
	>
		<div
			class="grid size-full mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))] [grid-area:1/1]"
		>
			<div class={cn("size-full bg-slate-950", className)}>
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
		<div
			class="will-change-background grid size-full opacity-[var(--opacity)] mix-blend-soft-light transition-opacity delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] [background:radial-gradient(farthest-corner_circle_at_var(--m-x)_var(--m-y),_rgba(255,255,255,0.8)_10%,_rgba(255,255,255,0.65)_20%,_rgba(255,255,255,0)_90%)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [grid-area:1/1]"
		></div>
		<div
			class="glare-foil relative grid size-full opacity-[var(--opacity)] [background-blend-mode:hue_hue_hue_overlay] mix-blend-color-dodge transition-opacity will-change-[background] [background:var(--pattern),_var(--rainbow),_var(--diagonal),_var(--shade)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [grid-area:1/1] after:bg-[inherit] after:[background-size:var(--foil-size),_200%_400%,_800%,_200%] after:[background-position:center,_0%_var(--bg-y),_calc(var(--bg-x)*_-1)_calc(var(--bg-y)*_-1),_var(--bg-x)_var(--bg-y)] after:[background-blend-mode:soft-light,_hue,_hard-light] after:mix-blend-exclusion after:content-[''] after:[grid-area:1/1]"
		></div>
	</div>
</div>

<style>
	.glare-foil {
		--step: 5%;
		--foil-svg: url("data:image/svg+xml,%3Csvg width='26' height='26' viewBox='0 0 26 26' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.99994 3.419C2.99994 3.419 21.6142 7.43646 22.7921 12.153C23.97 16.8695 3.41838 23.0306 3.41838 23.0306' stroke='white' stroke-width='5' stroke-miterlimit='3.86874' stroke-linecap='round' style='mix-blend-mode:darken'/%3E%3C/svg%3E");
		--pattern: var(--foil-svg) center/100% no-repeat;
		--rainbow: repeating-linear-gradient(
				0deg,
				rgb(255, 119, 115) calc(var(--step) * 1),
				rgba(255, 237, 95, 1) calc(var(--step) * 2),
				rgba(168, 255, 95, 1) calc(var(--step) * 3),
				rgba(131, 255, 247, 1) calc(var(--step) * 4),
				rgba(120, 148, 255, 1) calc(var(--step) * 5),
				rgb(216, 117, 255) calc(var(--step) * 6),
				rgb(255, 119, 115) calc(var(--step) * 7)
			)
			0% var(--bg-y) / 200% 700% no-repeat;
		--diagonal: repeating-linear-gradient(
				128deg,
				#0e152e 0%,
				hsl(180, 10%, 60%) 3.8%,
				hsl(180, 10%, 60%) 4.5%,
				hsl(180, 10%, 60%) 5.2%,
				#0e152e 10%,
				#0e152e 12%
			)
			var(--bg-x) var(--bg-y) / 300% no-repeat;
		--shade: radial-gradient(
				farthest-corner circle at var(--m-x) var(--m-y),
				rgba(255, 255, 255, 0.1) 12%,
				rgba(255, 255, 255, 0.15) 20%,
				rgba(255, 255, 255, 0.25) 120%
			)
			var(--bg-x) var(--bg-y) / 300% no-repeat;
		background-blend-mode: hue, hue, hue, overlay;
	}
</style>
