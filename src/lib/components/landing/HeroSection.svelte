<script lang="ts">
	import { onMount } from "svelte";
	import { FluidCursor } from "$lib/fancy-ui";
	import SkinLink from "./SkinLink.svelte";

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

	// Accent → secondary sweep across "effortlessly": one gradient per glyph. A
	// single background over the whole line would clip wrong once the letters
	// animate apart, since each one is its own transformed box.
	//
	// The ramp used to be twelve hardcoded violet/blue pairs. It is mixed from the
	// skin's two accent tokens instead, so the headline follows the art direction
	// the visitor picked instead of staying violet under a green terminal skin.
	const SWEEP_STEPS = 12;

	/**
	 * Mix of the two accent tokens at `t` (0 = purple, 1 = blue).
	 *
	 * The clamp is load-bearing: a percentage outside 0–100 makes the whole
	 * `color-mix()` invalid, the `background-image` declaration is dropped, and
	 * the glyph — which relies on `.text-transparent` to show the gradient —
	 * renders as nothing at all. The tail of the word simply vanishes.
	 */
	const accent = (t: number) =>
		`color-mix(in oklab, var(--skin-blue,#5b8cff) ${Math.round(Math.min(1, Math.max(0, t)) * 100)}%, var(--skin-purple,#8b7bff))`;

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
				// Past the ramp is the trailing period: solid, and the inline colour
				// overrides the .text-transparent the gradient glyphs rely on.
				if (index < SWEEP_STEPS) {
					const t = index / SWEEP_STEPS;
					style += `;background-image:linear-gradient(100deg,${accent(t)},${accent(t + 0.35)})`;
				} else {
					style += ";color:var(--skin-purple,#8b7bff)";
				}
			}

			return { char, style };
		});
	}

	const HEADLINE_LINES = LINES.map((line) => ({ ...line, glyphs: glyphsOf(line) }));

	/** Star dots in the nebula. Fixed positions — nothing here reads a clock. */
	const STARS = [
		{ top: 96, left: 474, size: 3, opacity: 1 },
		{ top: 170, left: 260, size: 2, opacity: 0.9 },
		{ top: 250, left: 420, size: 2, opacity: 0.7 },
		{ top: 320, left: 300, size: 2, opacity: 0.6 },
		{ top: 140, left: 360, size: 2, opacity: 0.8 },
	];
</script>

<svelte:head>
	<!-- The serif headline line is landing-only, so its webfont loads here rather
	     than through a skin's `fonts` list — it must survive every skin switch. -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
	/>
</svelte:head>

<!-- pt clears the sticky header (h-[72px]); without it the headline is clipped on load.
     The min-height ramps up with the viewport: at 68vh on a phone the centred column
     would sit under ~300px of dead space, since the copy is a third of the height it
     occupies on desktop.

     Trimmed from 62/78/86vh: the showcase panel below is now the point of the page,
     so the hero gives up the space that used to push it under the fold. -->
<section
	class="relative flex min-h-[52vh] items-center overflow-hidden pt-28 pb-10 sm:min-h-[62vh] lg:min-h-[68vh]"
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
			<!-- The gas reads from the accent tokens, so the nebula follows the skin
			     instead of staying violet under a green or amber art direction. -->
			<span
				class="blob absolute top-[120px] left-[120px] h-[230px] w-[380px] blur-[34px]"
				style="animation:heroBob 9s ease-in-out infinite;background:radial-gradient(ellipse 55% 50% at 55% 50%, color-mix(in srgb, var(--skin-purple,#8b7bff) 60%, transparent), color-mix(in srgb, var(--skin-blue,#5b8cff) 30%, transparent) 55%, transparent 75%)"
			></span>
			<span
				class="blob absolute top-[80px] left-[220px] h-[160px] w-[300px] blur-[28px]"
				style="animation:heroBob 9s ease-in-out 1.2s infinite;background:radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in srgb, var(--skin-yellow,#fbbf24) 45%, transparent), color-mix(in srgb, var(--skin-red,#fb7185) 25%, transparent) 55%, transparent 78%)"
			></span>
			<span
				class="absolute top-[60px] left-[300px] h-[110px] w-[220px] rotate-[-32deg] blur-[18px]"
				style="background:radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in srgb, var(--skin-page-fg,#f8fafc) 70%, transparent), color-mix(in srgb, var(--skin-blue,#5b8cff) 30%, transparent) 60%, transparent 80%)"
			></span>
			<span
				class="absolute top-[250px] left-[80px] h-[150px] w-[260px] rotate-[-18deg] blur-[30px]"
				style="background:radial-gradient(ellipse 55% 50% at 50% 50%, color-mix(in srgb, var(--skin-blue,#5b8cff) 40%, transparent), transparent 75%)"
			></span>

			{#each STARS as star (star.top + star.left)}
				<span
					class="absolute rounded-full"
					style="top:{star.top}px;left:{star.left}px;height:{star.size}px;width:{star.size}px;opacity:{star.opacity};background:var(--skin-page-fg,#f8fafc)"
				></span>
			{/each}

			<svg
				viewBox="0 0 40 46"
				class="blob absolute top-[52px] left-[392px] w-[38px]"
				style="animation:heroLtrD 1.2s {EASE} .5s both"
			>
				<path
					d="M4,2 L12,38 L18,24 L34,20 Z"
					fill="var(--skin-page-fg,#f1f5f9)"
					stroke="var(--skin-page-bg,#0a0a12)"
					stroke-width="2.5"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- Mobile stand-in for the nebula: one soft glow, no absolute 640px box. -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute -top-[20%] -right-[6%] h-[120%] w-[70%] blur-[40px] lg:hidden"
			style="background:radial-gradient(ellipse 50% 40% at 60% 40%, color-mix(in srgb, var(--skin-purple,#8b7bff) 35%, transparent), color-mix(in srgb, var(--skin-blue,#5b8cff) 15%, transparent) 55%, transparent 75%)"
		></div>

		<div class="relative z-[2] flex max-w-[640px] flex-col gap-[22px]">
			<h1 class="text-[clamp(40px,5.15vw,74px)] leading-[1.08] font-bold tracking-[-0.03em]">
				<!-- The visible headline is one <span> per glyph so each can enter on its
				     own keyframe; the sr-only copy is what names the heading. -->
				<span class="sr-only">{HEADLINE}</span>
				{#each HEADLINE_LINES as line (line.text)}
					<span
						aria-hidden="true"
						class="block whitespace-nowrap {line.serif ? 'serif-line tracking-[-0.01em]' : ''}"
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
				class="glyph lp-muted max-w-[430px] text-[15.5px] leading-[1.7]"
				style="animation:heroLtrB 1s {EASE} 1.6s both"
			>
				One component set, many art directions. Change the skin in the header and watch the whole
				page — including this one — follow.
			</p>

			<div
				class="glyph flex flex-wrap items-center gap-3"
				style="animation:heroLtrB 1s {EASE} 1.72s both"
			>
				<SkinLink href="/docs" size="lg">Get Started →</SkinLink>
				<SkinLink href="/docs/components" size="lg" variant="secondary">Explore Components</SkinLink
				>
			</div>
		</div>
	</div>
</section>

<style>
	.serif-line {
		font-family: "Instrument Serif", Georgia, "Times New Roman", serif;
		font-style: italic;
		/* Instrument Serif ships a single 400 weight; anything heavier would be
		   synthesized by the browser and muddy the letterforms. This also undoes
		   the h1's font-bold for this line. */
		font-weight: 400;
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
