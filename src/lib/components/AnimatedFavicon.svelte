<script lang="ts">
	import { onMount } from "svelte";

	const FRAME_COUNT = 12;
	const FRAME_DURATION = 100; // ms

	// Base particle positions
	const particles = [
		{ cx: 8, cy: 10, r: 4, gradient: "g1" },
		{ cx: 22, cy: 8, r: 3, gradient: "g2" },
		{ cx: 16, cy: 18, r: 5, gradient: "g3" },
		{ cx: 24, cy: 22, r: 3.5, gradient: "g1" },
		{ cx: 10, cy: 24, r: 2.5, gradient: "g2" },
	];

	// Animation offsets for each particle (dx, dy amplitude)
	const offsets = [
		{ dx: 2, dy: -3 },
		{ dx: -3, dy: 2 },
		{ dx: 3, dy: 3 },
		{ dx: -2, dy: -2 },
		{ dx: 1, dy: 2 },
	];

	function generateFrame(frameIndex: number): string {
		const t = (frameIndex / FRAME_COUNT) * Math.PI * 2;

		const circles = particles
			.map((p, i) => {
				const offset = offsets[i];
				const cx = p.cx + Math.sin(t + i * 0.5) * offset.dx;
				const cy = p.cy + Math.sin(t + i * 0.7) * offset.dy;
				return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${p.r}" fill="url(#${p.gradient})"/>`;
			})
			.join("\n    ");

		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
    <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  ${circles}
</svg>`;
	}

	function svgToDataUrl(svg: string): string {
		return `data:image/svg+xml;base64,${btoa(svg)}`;
	}

	onMount(() => {
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
