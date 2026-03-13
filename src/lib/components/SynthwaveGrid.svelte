<script lang="ts">
	import { onMount } from "svelte";

	let canvas: HTMLCanvasElement;
	let resizeObserver: ResizeObserver;

	// Props
	let {
		speed = 0.6,
		verticalLines = 14,
		horizontalLines = 12,
		colorH = "#ff2d78",
		colorV = "#bf5fff",
		sunColor1 = "#ffdd00",
		sunColor2 = "#ff2d78",
		class: className = "",
	}: {
		speed?: number;
		verticalLines?: number;
		horizontalLines?: number;
		colorH?: string;
		colorV?: string;
		sunColor1?: string;
		sunColor2?: string;
		class?: string;
	} = $props();

	onMount(() => {
		const ctx = canvas.getContext("2d")!;
		let offset = 0;
		let raf: number;

		function resize() {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		}

		function hexToRgb(hex: string) {
			const clean = hex.startsWith("#") ? hex : "#ff2d78";
			const r = parseInt(clean.slice(1, 3), 16) || 0;
			const g = parseInt(clean.slice(3, 5), 16) || 0;
			const b = parseInt(clean.slice(5, 7), 16) || 0;
			return { r, g, b };
		}

		function draw(ts: number) {
			const W = canvas.width;
			const H = canvas.height;

			// Skip until the canvas has real dimensions
			if (W === 0 || H === 0) {
				raf = requestAnimationFrame(draw);
				return;
			}

			// Scroll offset — drives the "forward" motion
			offset = (ts * speed * 0.05) % (H / horizontalLines);

			ctx.clearRect(0, 0, W, H);

			// ── Background gradient ──────────────────────────────────────────
			const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
			bgGrad.addColorStop(0, "#0a0015");
			bgGrad.addColorStop(0.45, "#12002a");
			bgGrad.addColorStop(1, "#0a0015");
			ctx.fillStyle = bgGrad;
			ctx.fillRect(0, 0, W, H);

			const horizonY = H * 0.48;
			const vpX = W / 2;

			// ── Sun ──────────────────────────────────────────────────────────
			const sunR = Math.min(W, H) * 0.18;
			const sunY = horizonY;
			const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY);
			sunGrad.addColorStop(0, sunColor1);
			sunGrad.addColorStop(1, sunColor2);

			// Sun disk clipped to above horizon
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, W, horizonY);
			ctx.clip();
			ctx.beginPath();
			ctx.arc(vpX, sunY, sunR, 0, Math.PI * 2);
			ctx.fillStyle = sunGrad;
			ctx.fill();

			// Horizontal band cuts on the sun
			const rgbH = hexToRgb(colorH);
			const bandCount = 6;
			for (let i = 0; i < bandCount; i++) {
				const t = i / bandCount;
				const bandY = sunY - sunR + t * sunR * 1.1;
				const bandH = (sunR / bandCount) * 0.35;
				ctx.fillStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${0.55 + i * 0.06})`;
				ctx.fillRect(vpX - sunR, bandY, sunR * 2, bandH);
			}
			ctx.restore();

			// Sun glow
			const glowGrad = ctx.createRadialGradient(vpX, sunY, sunR * 0.6, vpX, sunY, sunR * 2.2);
			glowGrad.addColorStop(0, `${sunColor2}55`);
			glowGrad.addColorStop(1, "transparent");
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, W, horizonY);
			ctx.clip();
			ctx.fillStyle = glowGrad;
			ctx.fillRect(0, 0, W, H);
			ctx.restore();

			// ── Grid — floor (below horizon) ────────────────────────────────
			const floorH = H - horizonY;
			const rgbV = hexToRgb(colorV);
			const rgbHc = hexToRgb(colorH);

			// Vertical lines — fan out from vanishing point
			const spread = W * 0.7;
			for (let i = 0; i <= verticalLines; i++) {
				const t = i / verticalLines; // 0 → 1
				const bottomX = vpX - spread / 2 + t * spread;
				const alpha = 0.15 + 0.55 * (1 - Math.abs(t - 0.5) * 2);
				const lineGrad = ctx.createLinearGradient(vpX, horizonY, bottomX, H);
				lineGrad.addColorStop(0, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},0)`);
				lineGrad.addColorStop(0.3, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},${alpha * 0.6})`);
				lineGrad.addColorStop(1, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},${alpha})`);
				ctx.beginPath();
				ctx.moveTo(vpX, horizonY);
				ctx.lineTo(bottomX, H);
				ctx.strokeStyle = lineGrad;
				ctx.lineWidth = 1;
				ctx.stroke();
			}

			// Horizontal lines — perspective-spaced with animation offset
			// In perspective: lines are at world-depth z=1..N
			// screen_y = horizonY + floorH * (1 - 1/z_normalized)
			// We animate by shifting the "phase" so lines appear to scroll forward

			const totalSlots = horizontalLines;
			const slotSize = floorH / totalSlots;

			for (let i = 1; i <= totalSlots + 1; i++) {
				// Add offset to create motion — fractional slot position
				const slot = slotSize > 0 ? i - offset / slotSize : i;
				if (slot <= 0) continue;

				// Perspective: closer to 1 = near bottom (close), close to totalSlots = near horizon
				const tz = Math.min(1, slot / totalSlots); // clamp: Math.pow needs non-negative base
				const screenY = horizonY + floorH * (1 - Math.pow(1 - tz, 2.2));
				if (screenY > H + 2) continue;

				// Width of horizontal line matches the fan at this Y
				const progress = (screenY - horizonY) / floorH; // 0 at horizon, 1 at bottom
				const lineLeft = vpX - (spread / 2) * progress;
				const lineRight = vpX + (spread / 2) * progress;

				const alpha = 0.08 + 0.7 * progress;
				ctx.beginPath();
				ctx.moveTo(lineLeft, screenY);
				ctx.lineTo(lineRight, screenY);

				// Gradient on horizontal lines: glow toward center
				const hGrad = ctx.createLinearGradient(lineLeft, screenY, lineRight, screenY);
				hGrad.addColorStop(0, `rgba(${rgbHc.r},${rgbHc.g},${rgbHc.b},0)`);
				hGrad.addColorStop(0.2, `rgba(${rgbHc.r},${rgbHc.g},${rgbHc.b},${alpha})`);
				hGrad.addColorStop(0.5, `rgba(${rgbHc.r},${rgbHc.g},${rgbHc.b},${alpha * 1.3})`);
				hGrad.addColorStop(0.8, `rgba(${rgbHc.r},${rgbHc.g},${rgbHc.b},${alpha})`);
				hGrad.addColorStop(1, `rgba(${rgbHc.r},${rgbHc.g},${rgbHc.b},0)`);

				ctx.strokeStyle = hGrad;
				ctx.lineWidth = progress < 0.3 ? 0.5 : 1;
				ctx.stroke();
			}

			// ── Sky glow (above horizon) ─────────────────────────────────────
			const skyGlow = ctx.createLinearGradient(0, 0, 0, horizonY);
			skyGlow.addColorStop(0, "transparent");
			skyGlow.addColorStop(1, `${colorV}18`);
			ctx.fillStyle = skyGlow;
			ctx.fillRect(0, 0, W, horizonY);

			// ── Vignette ─────────────────────────────────────────────────────
			const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
			vig.addColorStop(0, "transparent");
			vig.addColorStop(1, "rgba(0,0,0,0.65)");
			ctx.fillStyle = vig;
			ctx.fillRect(0, 0, W, H);

			raf = requestAnimationFrame(draw);
		}

		resize();
		raf = requestAnimationFrame(draw);

		resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class="absolute inset-0 h-full w-full {className}" aria-hidden="true"
></canvas>
