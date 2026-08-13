<script lang="ts">
	import { onMount } from "svelte";
	import { FluidCursor } from "$lib/fancy-ui";

	// The WebGPU/WebGL fluid simulation is the heaviest thing on the page — hold it
	// back until the browser is idle so it never competes with first paint, and skip
	// it entirely for visitors who asked for less motion.
	let showFluidCursor = $state(false);

	onMount(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		if ("requestIdleCallback" in window) {
			requestIdleCallback(
				() => {
					showFluidCursor = true;
				},
				{ timeout: 200 }
			);
		} else {
			setTimeout(() => {
				showFluidCursor = true;
			}, 100);
		}
	});

	const HEADLINE = "Build stunning interfaces, effortlessly.";
	const EASE = "cubic-bezier(.34,1.56,.64,1)";

	// Violet → blue sweep across "effortlessly": one gradient per glyph. A single
	// background over the whole line would clip wrong once the letters animate
	// apart, since each one is its own transformed box.
	const SWEEP = [
		["#f0abfc", "#c084fc"],
		["#e9a5fb", "#b18cfa"],
		["#e29ffa", "#a394f9"],
		["#db99f9", "#9599f8"],
		["#d493f8", "#8b9df7"],
		["#cd8df7", "#81a2f7"],
		["#c687f6", "#77a6f6"],
		["#bf81f5", "#6daaf5"],
		["#b87bf4", "#63aef4"],
		["#b175f3", "#59b2f3"],
		["#aa6ff2", "#4fb6f2"],
		["#a369f1", "#45baf1"],
	];

	type Line = {
		text: string;
		/** One letter per glyph picking its entry keyframe (heroLtrA…heroLtrE).
		 *  "." marks the word gap — a spacer that animates nothing. The order is
		 *  deliberately irregular so the headline reads as scattered objects
		 *  landing, not as a single sweep. */
		anims: string;
		start: number;
		duration: number;
		serif?: boolean;
		/** The closing period lands a beat late, after the last letter settles. */
		lastDelay?: number;
	};

	const LINES: Line[] = [
		{ text: "Build stunning", anims: "DABCE.ABDCAEBC", start: 0, duration: 1.1 },
		{ text: "interfaces,", anims: "EADBCAEBDCA", start: 0.54, duration: 1.1 },
		{
			text: "effortlessly.",
			anims: "BCDAEBCDAEBCD",
			start: 1,
			duration: 1.2,
			serif: true,
			lastDelay: 1.52,
		},
	];

	function glyphsOf(line: Line) {
		const chars = [...line.text];
		let tick = 0;

		return chars.map((char, index) => {
			if (char === " ") return { char, style: "" };

			const isLast = index === chars.length - 1;
			const delay =
				isLast && line.lastDelay !== undefined
					? line.lastDelay
					: Math.round((line.start + tick * 0.04) * 100) / 100;
			tick += 1;

			let style = `animation:heroLtr${line.anims[index]} ${line.duration}s ${EASE} ${delay}s both`;

			if (line.serif) {
				const pair = SWEEP[index];
				// No pair left means the trailing period: solid, and the inline colour
				// overrides the .text-transparent the gradient glyphs rely on.
				style += pair
					? `;background-image:linear-gradient(100deg,${pair[0]},${pair[1]})`
					: ";color:#c084fc";
			}

			return { char, style };
		});
	}

	const HEADLINE_LINES = LINES.map((line) => ({ ...line, glyphs: glyphsOf(line) }));
</script>

<!-- pt clears the sticky header (h-[72px]); without it the headline is clipped on load.
     The min-height ramps up with the viewport: at 86vh on a phone the centred column
     would sit under ~300px of dead space, since the copy is a third of the height it
     occupies on desktop. -->
<section
	class="relative flex min-h-[62vh] items-center overflow-hidden pt-28 pb-16 sm:min-h-[78vh] lg:min-h-[86vh]"
>
	{#if showFluidCursor}
		<FluidCursor simResolution={128} hdr hdrBoost={2} splatOnMount />
	{/if}

	<div class="relative mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-14">
		<!-- Nebula. 640×480 of blurred gas, star dots and a stray cursor glyph. Hidden
		     below lg, where a box that wide would push the page into horizontal scroll. -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute -top-10 right-10 hidden h-[480px] w-[640px] lg:block"
		>
			<span
				class="blob absolute top-[120px] left-[120px] h-[230px] w-[380px] bg-[radial-gradient(ellipse_55%_50%_at_55%_50%,rgba(124,58,237,.6),rgba(59,130,246,.3)_55%,transparent_75%)] blur-[34px]"
				style="animation:heroBob 9s ease-in-out infinite"
			></span>
			<span
				class="blob absolute top-[80px] left-[220px] h-[160px] w-[300px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(251,146,60,.5),rgba(244,63,158,.25)_55%,transparent_78%)] blur-[28px]"
				style="animation:heroBob 9s ease-in-out 1.2s infinite"
			></span>
			<span
				class="absolute top-[60px] left-[300px] h-[110px] w-[220px] rotate-[-32deg] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(226,232,255,.75),rgba(147,197,253,.3)_60%,transparent_80%)] blur-[18px]"
			></span>
			<span
				class="absolute top-[250px] left-[80px] h-[150px] w-[260px] rotate-[-18deg] bg-[radial-gradient(ellipse_55%_50%_at_50%_50%,rgba(96,165,250,.4),transparent_75%)] blur-[30px]"
			></span>

			<span
				class="absolute top-[96px] left-[474px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_#fff]"
			></span>
			<span
				class="absolute top-[170px] left-[260px] h-[2px] w-[2px] rounded-full bg-[#e0e7ff] opacity-90"
			></span>
			<span
				class="absolute top-[250px] left-[420px] h-[2px] w-[2px] rounded-full bg-[#e0e7ff] opacity-70"
			></span>
			<span
				class="absolute top-[320px] left-[300px] h-[2px] w-[2px] rounded-full bg-[#c7d2fe] opacity-60"
			></span>
			<span
				class="absolute top-[140px] left-[360px] h-[2px] w-[2px] rounded-full bg-white opacity-80"
			></span>

			<svg
				viewBox="0 0 40 46"
				class="blob absolute top-[52px] left-[392px] w-[38px]"
				style="animation:heroLtrD 1.2s {EASE} .5s both"
			>
				<path
					d="M4,2 L12,38 L18,24 L34,20 Z"
					fill="#f1f5f9"
					stroke="#0a0a12"
					stroke-width="2.5"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- Mobile stand-in for the nebula: one soft glow, no absolute 640px box. -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute -top-[20%] -right-[6%] h-[120%] w-[70%] bg-[radial-gradient(ellipse_50%_40%_at_60%_40%,rgba(124,58,237,.35),rgba(59,130,246,.15)_55%,transparent_75%)] blur-[40px] lg:hidden"
		></div>

		<div class="relative z-[2] flex max-w-[640px] flex-col gap-[22px]">
			<h1
				class="text-[clamp(40px,5.15vw,74px)] leading-[1.08] font-bold tracking-[-0.03em] text-[#f8fafc]"
			>
				<!-- The visible headline is one <span> per glyph so each can enter on its
				     own keyframe; the sr-only copy is what names the heading. -->
				<span class="sr-only">{HEADLINE}</span>
				{#each HEADLINE_LINES as line (line.text)}
					<span
						aria-hidden="true"
						class="block whitespace-nowrap {line.serif
							? 'serif-line font-medium tracking-[-0.01em]'
							: ''}"
					>
						{#each line.glyphs as glyph, index (index)}
							{#if glyph.char === " "}
								<span class="inline-block w-[0.28em]"></span>
							{:else}
								<span
									class="glyph inline-block {line.serif ? 'bg-clip-text text-transparent' : ''}"
									style={glyph.style}>{glyph.char}</span
								>
							{/if}
						{/each}
					</span>
				{/each}
			</h1>

			<p
				class="glyph max-w-[400px] text-[15.5px] leading-[1.7] text-[#9aa3b2]"
				style="animation:heroLtrB 1s {EASE} 1.6s both"
			>
				Fancy UI is a modern UI kit and design system that helps you ship beautiful products faster.
			</p>

			<div class="glyph flex flex-wrap gap-3" style="animation:heroLtrB 1s {EASE} 1.72s both">
				<a
					href="/docs"
					class="inline-flex items-center gap-2.5 rounded-[10px] bg-[#f8fafc] px-5 py-[11px] text-[13px] font-semibold text-[#0a0a0e] transition-opacity hover:opacity-90"
				>
					Get Started <span aria-hidden="true">→</span>
				</a>
				<a
					href="/docs/components"
					class="inline-flex items-center rounded-[10px] border border-white/14 bg-[rgba(16,15,26,.7)] px-5 py-[11px] text-[13px] font-medium text-[#e6e9ef] transition-colors hover:border-white/30"
				>
					Explore Components
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.serif-line {
		font-family: Georgia, "Times New Roman", serif;
		font-style: italic;
	}

	/* Global names: the animations are applied through inline `style` (each glyph
	   carries its own delay), and Svelte only rewrites keyframe names inside its
	   own scoped rules — a locally scoped name would never resolve. */
	@keyframes -global-heroLtrA {
		0% {
			transform: translateY(-160px) rotate(-28deg);
			opacity: 0;
		}
		60% {
			transform: translateY(14px) rotate(4deg);
			opacity: 1;
		}
		80% {
			transform: translateY(-6px) rotate(-2deg);
		}
		100% {
			transform: translateY(0) rotate(0);
		}
	}

	@keyframes -global-heroLtrB {
		0% {
			transform: translateY(140px) scaleY(-1);
			opacity: 0;
		}
		55% {
			transform: translateY(-12px) scaleY(1);
			opacity: 1;
		}
		75% {
			transform: translateY(5px);
		}
		100% {
			transform: translateY(0);
		}
	}

	@keyframes -global-heroLtrC {
		0% {
			transform: translateX(-120px) skewX(18deg);
			opacity: 0;
		}
		65% {
			transform: translateX(10px) skewX(-6deg);
			opacity: 1;
		}
		100% {
			transform: translateX(0) skewX(0);
		}
	}

	@keyframes -global-heroLtrD {
		0% {
			transform: scale(0) rotate(200deg);
			opacity: 0;
		}
		70% {
			transform: scale(1.18) rotate(-8deg);
			opacity: 1;
		}
		100% {
			transform: scale(1) rotate(0);
		}
	}

	@keyframes -global-heroLtrE {
		0% {
			transform: translateX(130px) rotate(20deg);
			opacity: 0;
		}
		60% {
			transform: translateX(-8px) rotate(-3deg);
			opacity: 1;
		}
		100% {
			transform: translateX(0) rotate(0);
		}
	}

	@keyframes -global-heroBob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-14px);
		}
	}

	/* !important because every animation above is set through an inline style, which
	   a plain declaration could not override. The entry keyframes all use
	   `fill-mode: both`, so cancelling them leaves each element at its resting
	   state — visible, in place, no extra overrides needed. */
	@media (prefers-reduced-motion: reduce) {
		.glyph,
		.blob {
			animation: none !important;
		}
	}
</style>
