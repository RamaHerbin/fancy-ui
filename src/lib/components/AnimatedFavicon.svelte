<script lang="ts">
	import { onMount } from "svelte";

	// The brand mark re-emitted as favicon frames. Browsers ignore CSS animation
	// inside a favicon SVG, so the twinkle in `static/favicon.svg` is replayed
	// here by swapping `link[rel="icon"]` through pre-rendered data URLs.
	// Geometry, gradients and layer order are copied from that file -- keep the
	// two in step (Logo.svelte is the third copy).

	// 16 frames at 90ms = the 1.4s cycle of the `twinkle` keyframes in favicon.svg.
	const FRAME_COUNT = 16;
	const FRAME_DURATION = 90; // ms

	const MARK_PATH = "M16 3Q16.7 15.3 29 16Q16.7 16.7 16 29Q15.3 16.7 3 16Q15.3 15.3 16 3Z";

	// Scale and opacity only, no rotation: the silhouette has four-fold symmetry
	// but the gradients do not, so a quarter turn would land the pink arm where
	// the cyan one started and the loop would jump. Cosine puts frame 0 at rest.
	// The amplitude is deliberately wide -- a tab favicon is 16px, where anything
	// subtler than this reads as no animation at all.
	function generateFrame(frameIndex: number): string {
		const phase = (frameIndex / FRAME_COUNT) * Math.PI * 2;
		const scale = 0.8 + Math.cos(phase) * 0.2; // 0.6 -> 1
		const opacity = 0.725 + Math.cos(phase) * 0.275; // 0.45 -> 1

		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <path id="mk" d="${MARK_PATH}"/>
    <linearGradient id="spark" x1="0" y1="0.5" x2="1" y2="0.5">
      <stop offset="0" stop-color="#d22374"/>
      <stop offset="0.25" stop-color="#fd4ba0"/>
      <stop offset="0.375" stop-color="#c128c1"/>
      <stop offset="0.44" stop-color="#9624dd"/>
      <stop offset="0.5" stop-color="#6f27f7"/>
      <stop offset="0.5625" stop-color="#512df7"/>
      <stop offset="0.625" stop-color="#4537f7"/>
      <stop offset="0.75" stop-color="#487df9"/>
      <stop offset="0.875" stop-color="#71e8fc"/>
      <stop offset="1" stop-color="#8ff0fe"/>
    </linearGradient>
    <linearGradient id="verts" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#faebfd" stop-opacity="0.92"/>
      <stop offset="0.125" stop-color="#fba4fb" stop-opacity="0.88"/>
      <stop offset="0.27" stop-color="#cd50fb" stop-opacity="0.6"/>
      <stop offset="0.4" stop-color="#912ffa" stop-opacity="0"/>
      <stop offset="0.6" stop-color="#8322f8" stop-opacity="0"/>
      <stop offset="0.73" stop-color="#bf2ffa" stop-opacity="0.6"/>
      <stop offset="0.875" stop-color="#fc72fb" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#fdd8fd" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="rim" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0" stop-color="#ffe2f2" stop-opacity="1"/>
      <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.92"/>
      <stop offset="0.62" stop-color="#dcefff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#8fd9ff" stop-opacity="0.14"/>
    </linearGradient>
    <radialGradient id="tips" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.8"/>
    </radialGradient>
    <filter id="halo" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="0.8"/>
    </filter>
    <filter id="softRim" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="0.45"/>
    </filter>
  </defs>
  <g opacity="${opacity.toFixed(3)}" transform="translate(16 16) scale(${scale.toFixed(3)}) translate(-16 -16)">
    <use href="#mk" fill="url(#spark)" filter="url(#halo)" opacity="0.8"/>
    <use href="#mk" fill="url(#spark)" filter="url(#bloom)" opacity="0.85"/>
    <use href="#mk" fill="url(#spark)"/>
    <use href="#mk" fill="url(#verts)"/>
    <use href="#mk" fill="url(#tips)"/>
    <use href="#mk" fill="none" stroke="url(#rim)" stroke-width="1.2" opacity="0.55" filter="url(#softRim)"/>
    <use href="#mk" fill="none" stroke="url(#rim)" stroke-width="0.28" opacity="0.72"/>
  </g>
</svg>`;
	}

	function svgToDataUrl(svg: string): string {
		return `data:image/svg+xml;base64,${btoa(svg)}`;
	}

	onMount(() => {
		// A reader who asked for less motion keeps the static icon from app.html.
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

		// Pre-generate all frames
		const frames = Array.from({ length: FRAME_COUNT }, (_, i) => svgToDataUrl(generateFrame(i)));

		let currentFrame = 0;
		let linkElement: HTMLLinkElement | null = document.querySelector('link[rel="icon"]');

		// Create link element if it doesn't exist
		if (!linkElement) {
			linkElement = document.createElement("link");
			linkElement.rel = "icon";
			linkElement.type = "image/svg+xml";
			document.head.appendChild(linkElement);
		}

		// Set initial frame
		linkElement.href = frames[currentFrame];

		const interval = setInterval(() => {
			currentFrame = (currentFrame + 1) % FRAME_COUNT;
			if (linkElement) {
				linkElement.href = frames[currentFrame];
			}
		}, FRAME_DURATION);

		return () => {
			clearInterval(interval);
		};
	});
</script>
