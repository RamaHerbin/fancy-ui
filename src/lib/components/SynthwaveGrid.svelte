<script lang="ts">
	import { onMount } from "svelte";

	let canvas: HTMLCanvasElement;

	// Props (contract kept from the original component; only the sun defaults
	// changed to the warmer sunset palette).
	let {
		speed = 0.6,
		verticalLines = 14,
		horizontalLines = 12,
		colorH = "#ff2d78",
		colorV = "#bf5fff",
		sunColor1 = "#ffd76a",
		sunColor2 = "#ff7a2f",
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

	function hexToRgb(hex: string) {
		const normalized = /^#?[0-9a-fA-F]{6}$/.test(hex)
			? hex.startsWith("#")
				? hex
				: `#${hex}`
			: "#ff2d78";
		const r = parseInt(normalized.slice(1, 3), 16);
		const g = parseInt(normalized.slice(3, 5), 16);
		const b = parseInt(normalized.slice(5, 7), 16);
		return { r, g, b };
	}

	// Deterministic PRNG so resize never reshuffles the scene.
	function mulberry32(seed: number) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	onMount(() => {
		const ctx = canvas.getContext("2d")!;
		// Static scenery is baked into two offscreen layers on resize; per frame
		// we only composite them around the animated grid. backLayer = everything
		// behind the grid lines, frontLayer = everything in front (palms, car,
		// vignette). temp is scratch space for the sun-slit knockout.
		const backLayer = document.createElement("canvas");
		const frontLayer = document.createElement("canvas");
		const temp = document.createElement("canvas");

		const rgbH = hexToRgb(colorH);
		const rgbV = hexToRgb(colorV);
		const rgbSunTop = hexToRgb(sunColor1);
		const rgbSunBottom = hexToRgb(sunColor2);

		let raf = 0;
		let staticDirty = true;

		// Scene metrics, recomputed on resize (all in CSS pixels).
		let W = 0;
		let H = 0;
		let dpr = 1;
		let horizonY = 0;
		let vpX = 0;
		let waterH = 0;
		let gridHorizonY = 0;
		let gridFloorH = 0;
		let sunR = 0;
		let sunX = 0;
		let sunY = 0;

		// Animated subsets (positions seeded, only alpha/x wobble per frame).
		let twinkleStars: { x: number; y: number; size: number; baseAlpha: number; phase: number }[] =
			[];
		let shimmerLines: { xc: number; y: number; len: number; phase: number }[] = [];

		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		let reducedMotion = motionQuery.matches;

		function computeMetrics() {
			W = canvas.offsetWidth;
			H = canvas.offsetHeight;
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			horizonY = H * 0.48;
			vpX = W / 2;
			const floorH = H - horizonY;
			waterH = floorH * 0.12;
			gridHorizonY = horizonY + waterH;
			gridFloorH = H - gridHorizonY;
			sunR = Math.min(W, H) * 0.32;
			sunX = vpX;
			sunY = horizonY - sunR * 0.2;
		}

		function setupLayer(layer: HTMLCanvasElement): CanvasRenderingContext2D {
			layer.width = Math.max(1, Math.round(W * dpr));
			layer.height = Math.max(1, Math.round(H * dpr));
			const c = layer.getContext("2d")!;
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			return c;
		}

		// ── Static back layer ──────────────────────────────────────────────

		function drawSky(c: CanvasRenderingContext2D) {
			const g = c.createLinearGradient(0, 0, 0, horizonY);
			g.addColorStop(0, "#07001a");
			g.addColorStop(0.55, "#22073f");
			g.addColorStop(1, "#7a1e52");
			c.fillStyle = g;
			c.fillRect(0, 0, W, horizonY);
		}

		function drawStars(c: CanvasRenderingContext2D, rand: () => number) {
			twinkleStars = [];
			const maxY = horizonY - H * 0.08; // keep clear of the mountain ridges
			for (let i = 0; i < 120; i++) {
				const x = rand() * W;
				const y = rand() * maxY;
				const size = rand() < 0.8 ? 1 : 2;
				const alpha = 0.15 + rand() * 0.55;
				if (i < 80) {
					c.fillStyle = `rgba(232,230,255,${alpha})`;
					c.fillRect(x, y, size, size);
				} else {
					twinkleStars.push({ x, y, size, baseAlpha: alpha, phase: rand() * Math.PI * 2 });
				}
			}
		}

		function drawHaze(c: CanvasRenderingContext2D, rand: () => number) {
			for (let i = 0; i < 4; i++) {
				const y = horizonY * (0.55 + 0.4 * (i / 3));
				c.fillStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${0.04 + rand() * 0.04})`;
				c.fillRect(0, y, W, 1 + Math.round(rand() * 2));
			}
		}

		function drawSunGlow(c: CanvasRenderingContext2D) {
			// Unclipped so the warmth bleeds onto the water below the horizon.
			const g = c.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 2.4);
			g.addColorStop(0, `rgba(${rgbSunBottom.r},${rgbSunBottom.g},${rgbSunBottom.b},0.32)`);
			g.addColorStop(1, "rgba(0,0,0,0)");
			c.fillStyle = g;
			c.fillRect(0, 0, W, H);
		}

		function drawSun(c: CanvasRenderingContext2D) {
			// Disk with knocked-out slits: build on the scratch canvas so the
			// destination-out punches only affect the sun, then composite under
			// the above-horizon clip. The gaps show real sky, unlike the opaque
			// bands of the previous version.
			const t = setupLayer(temp);
			t.clearRect(0, 0, W, H);
			const g = t.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
			g.addColorStop(0, sunColor1);
			g.addColorStop(1, sunColor2);
			t.beginPath();
			t.arc(sunX, sunY, sunR, 0, Math.PI * 2);
			t.fillStyle = g;
			t.fill();
			t.globalCompositeOperation = "destination-out";
			// Slits span the visible lower half (the horizon clips at sunY + 0.2R)
			// and thicken toward the bottom.
			for (let i = 0; i < 7; i++) {
				const centerY = sunY + sunR * (-0.52 + i * 0.115);
				const thickness = sunR * (0.018 + i * 0.011);
				t.fillRect(sunX - sunR, centerY - thickness / 2, sunR * 2, thickness);
			}
			t.globalCompositeOperation = "source-over";

			c.save();
			c.beginPath();
			c.rect(0, 0, W, horizonY);
			c.clip();
			c.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, W, H);
			c.restore();
		}

		function drawMountains(c: CanvasRenderingContext2D, rand: () => number) {
			const ridges = [
				{ amp: H * 0.11, fill: "#2b1147", rimAlpha: 0.4, divisor: 20 },
				{ amp: H * 0.075, fill: "#120720", rimAlpha: 0.6, divisor: 28 },
			];
			for (const ridge of ridges) {
				const points: { x: number; y: number }[] = [];
				const step = Math.max(28, W / ridge.divisor);
				let peak = true;
				for (let x = -step; x <= W + step; x += step) {
					// Ridges rise at the edges and flatten in the central sun corridor.
					const edgeWeight = Math.min(1, Math.abs(x - vpX) / (W * 0.26));
					// Alternating summits and saddles read as angular peaks, not noise.
					const h = peak ? 0.6 + rand() * 0.4 : 0.05 + rand() * 0.22;
					peak = !peak;
					points.push({
						x: x + (rand() - 0.5) * step * 0.35,
						y: horizonY - ridge.amp * h * edgeWeight,
					});
				}
				c.beginPath();
				c.moveTo(points[0].x, horizonY + 2);
				for (const p of points) c.lineTo(p.x, p.y);
				c.lineTo(points[points.length - 1].x, horizonY + 2);
				c.closePath();
				c.fillStyle = ridge.fill;
				c.fill();
				// Rim light along the top edge.
				c.beginPath();
				c.moveTo(points[0].x, points[0].y);
				for (const p of points) c.lineTo(p.x, p.y);
				c.strokeStyle = `rgba(${rgbV.r},${rgbV.g},${rgbV.b},${ridge.rimAlpha})`;
				c.lineWidth = 1.5;
				c.stroke();
			}
		}

		function drawSkyline(c: CanvasRenderingContext2D, rand: () => number) {
			let x = W * 0.6;
			let tallest = { x: 0, y: horizonY, w: 0 };
			while (x < W * 0.92) {
				const w = W * (0.008 + rand() * 0.014);
				const h = H * (0.015 + rand() * 0.045);
				const y = horizonY - h;
				c.fillStyle = "#1a0b2e";
				c.fillRect(x, y, w, h);
				if (rand() < 0.5) {
					c.fillStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0.6)`;
					c.fillRect(x, y, w, 1);
				}
				const windows = 2 + Math.floor(rand() * 4);
				for (let i = 0; i < windows; i++) {
					const warm = rand() < 0.6;
					c.fillStyle = warm
						? `rgba(255,215,106,${0.4 + rand() * 0.4})`
						: `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${0.4 + rand() * 0.4})`;
					c.fillRect(x + 1 + rand() * (w - 2), y + 2 + rand() * (h - 4), 1 + rand(), 1);
				}
				if (y < tallest.y) tallest = { x, y, w };
				x += w + W * (0.004 + rand() * 0.01);
			}
			if (tallest.w > 0) {
				c.strokeStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0.7)`;
				c.lineWidth = 1;
				c.beginPath();
				c.moveTo(tallest.x + tallest.w / 2, tallest.y);
				c.lineTo(tallest.x + tallest.w / 2, tallest.y - H * 0.02);
				c.stroke();
			}
		}

		function drawWater(c: CanvasRenderingContext2D, rand: () => number) {
			// Base band between the horizon and the grid's vanishing line.
			const g = c.createLinearGradient(0, horizonY, 0, gridHorizonY);
			g.addColorStop(0, "#3a1350");
			g.addColorStop(1, "#0e0620");
			c.fillStyle = g;
			c.fillRect(0, horizonY, W, waterH);

			// Darken the shoreline toward the edges so the lit water stays a pool
			// under the sun instead of a full-width band.
			const eg = c.createLinearGradient(0, 0, W, 0);
			eg.addColorStop(0, "rgba(7,2,16,0.95)");
			eg.addColorStop(0.3, "rgba(7,2,16,0.3)");
			eg.addColorStop(0.5, "rgba(7,2,16,0)");
			eg.addColorStop(0.7, "rgba(7,2,16,0.3)");
			eg.addColorStop(1, "rgba(7,2,16,0.95)");
			c.fillStyle = eg;
			c.fillRect(0, horizonY, W, waterH);

			// Warm reflection column under the sun: a broad wash plus a hotter core.
			const rg = c.createLinearGradient(0, horizonY, 0, gridHorizonY);
			rg.addColorStop(0, `rgba(${rgbSunBottom.r},${rgbSunBottom.g},${rgbSunBottom.b},0.5)`);
			rg.addColorStop(1, `rgba(${rgbSunBottom.r},${rgbSunBottom.g},${rgbSunBottom.b},0.05)`);
			c.beginPath();
			c.moveTo(sunX - sunR * 0.7, horizonY);
			c.lineTo(sunX + sunR * 0.7, horizonY);
			c.lineTo(sunX + sunR * 0.9, gridHorizonY);
			c.lineTo(sunX - sunR * 0.9, gridHorizonY);
			c.closePath();
			c.fillStyle = rg;
			c.fill();

			const cg = c.createLinearGradient(0, horizonY, 0, gridHorizonY);
			cg.addColorStop(0, `rgba(${rgbSunTop.r},${rgbSunTop.g},${rgbSunTop.b},0.45)`);
			cg.addColorStop(1, `rgba(${rgbSunTop.r},${rgbSunTop.g},${rgbSunTop.b},0)`);
			c.beginPath();
			c.moveTo(sunX - sunR * 0.26, horizonY);
			c.lineTo(sunX + sunR * 0.26, horizonY);
			c.lineTo(sunX + sunR * 0.36, gridHorizonY);
			c.lineTo(sunX - sunR * 0.36, gridHorizonY);
			c.closePath();
			c.fillStyle = cg;
			c.fill();

			// Static shimmer strokes, biased into the reflection column.
			shimmerLines = [];
			for (let i = 0; i < 22; i++) {
				const xc = sunX + (rand() - 0.5) * sunR * 1.5;
				const y = horizonY + 1 + rand() * (waterH - 2);
				const len = sunR * (0.15 + rand() * 0.55);
				if (i < 14) {
					c.strokeStyle = `rgba(255,196,120,${0.3 + rand() * 0.28})`;
					c.lineWidth = 1 + rand();
					c.beginPath();
					c.moveTo(xc - len / 2, y);
					c.lineTo(xc + len / 2, y);
					c.stroke();
				} else {
					shimmerLines.push({ xc, y, len, phase: rand() * Math.PI * 2 });
				}
			}

			// Bright edge where the grid meets the water.
			const spread = W * 0.7;
			const hg = c.createLinearGradient(vpX - spread / 2, 0, vpX + spread / 2, 0);
			hg.addColorStop(0, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0)`);
			hg.addColorStop(0.5, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},1)`);
			hg.addColorStop(1, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0)`);
			c.strokeStyle = hg;
			c.globalAlpha = 0.3;
			c.lineWidth = 2.5;
			c.beginPath();
			c.moveTo(vpX - spread / 2, gridHorizonY);
			c.lineTo(vpX + spread / 2, gridHorizonY);
			c.stroke();
			c.globalAlpha = 0.9;
			c.lineWidth = 1;
			c.stroke();
			c.globalAlpha = 1;
		}

		function drawFloorBase(c: CanvasRenderingContext2D) {
			const g = c.createLinearGradient(0, gridHorizonY, 0, H);
			g.addColorStop(0, "#0d0418");
			g.addColorStop(1, "#0a0015");
			c.fillStyle = g;
			c.fillRect(0, gridHorizonY, W, gridFloorH);
		}

		// ── Static front layer ─────────────────────────────────────────────

		function drawPalm(
			c: CanvasRenderingContext2D,
			baseX: number,
			baseY: number,
			height: number,
			lean: number,
			rand: () => number
		) {
			const crownX = baseX + lean * height * 0.35;
			const crownY = baseY - height;
			const ctrlX = baseX + lean * height * 0.08;
			const ctrlY = baseY - height * 0.5;

			// Trunk: sampled quadratic bezier, tapering width, round caps.
			c.strokeStyle = "#150a22";
			c.lineCap = "round";
			let prevX = baseX;
			let prevY = baseY;
			const segments = 10;
			for (let i = 1; i <= segments; i++) {
				const t = i / segments;
				const mt = 1 - t;
				const x = mt * mt * baseX + 2 * mt * t * ctrlX + t * t * crownX;
				const y = mt * mt * baseY + 2 * mt * t * ctrlY + t * t * crownY;
				c.lineWidth = height * (0.045 - 0.03 * t);
				c.beginPath();
				c.moveTo(prevX, prevY);
				c.lineTo(x, y);
				c.stroke();
				prevX = x;
				prevY = y;
			}

			// Fronds: filled tapered crescents fanned over the upper half-circle.
			// The return curve is pushed well below the outgoing one so each frond
			// has real body instead of collapsing into a hairline.
			const fronds = 10;
			const rimPaths: { cx: number; cy: number; tx: number; ty: number; mx: number; my: number }[] =
				[];
			for (let k = 0; k < fronds; k++) {
				// Fan past the horizontal on both sides so the outer fronds hang down.
				const angle = ((-198 + (216 * k) / (fronds - 1)) * Math.PI) / 180;
				const len = height * (0.3 + rand() * 0.2);
				const tipX = crownX + Math.cos(angle) * len;
				const tipY = crownY + Math.sin(angle) * len + len * 0.3; // droop
				const midX = (crownX + tipX) / 2;
				const midY = (crownY + tipY) / 2 - len * 0.2; // arc above the chord
				c.beginPath();
				c.moveTo(crownX, crownY);
				c.quadraticCurveTo(midX, midY, tipX, tipY);
				c.quadraticCurveTo(midX, midY + len * (0.3 + rand() * 0.12), crownX, crownY);
				c.closePath();
				c.fillStyle = "#150a22";
				c.fill();
				rimPaths.push({ cx: crownX, cy: crownY, tx: tipX, ty: tipY, mx: midX, my: midY });
			}
			// Crown core so the frond roots merge into one mass.
			c.beginPath();
			c.arc(crownX, crownY, height * 0.045, 0, Math.PI * 2);
			c.fillStyle = "#150a22";
			c.fill();

			// Rim light: trunk upper edge + frond upper curves.
			c.strokeStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0.3)`;
			c.lineWidth = 1.2;
			c.beginPath();
			c.moveTo(baseX, baseY);
			c.quadraticCurveTo(ctrlX, ctrlY, crownX, crownY);
			c.stroke();
			for (const p of rimPaths) {
				c.beginPath();
				c.moveTo(p.cx, p.cy);
				c.quadraticCurveTo(p.mx, p.my, p.tx, p.ty);
				c.stroke();
			}
		}

		function drawPalms(c: CanvasRenderingContext2D, rand: () => number) {
			// Every crown lands above the horizon: below it the silhouette would
			// sink into the floor and only its rim light would survive.
			drawPalm(c, W * 0.045, H * 1.06, H * 0.66, 1, rand);
			drawPalm(c, W * 0.16, H * 1.02, H * 0.56, 1, rand);
			drawPalm(c, W * 0.96, H * 1.06, H * 0.7, -1, rand);
			drawPalm(c, W * 0.85, H * 1.02, H * 0.58, -1, rand);
		}

		function roundedRect(
			c: CanvasRenderingContext2D,
			x: number,
			y: number,
			w: number,
			h: number,
			r: number
		) {
			c.beginPath();
			if (typeof c.roundRect === "function") c.roundRect(x, y, w, h, r);
			else c.rect(x, y, w, h);
		}

		function drawCar(c: CanvasRenderingContext2D) {
			// Rear view of a low, wide 80s coupé, static on the grid. Sits
			// right-of-centre so it never collides with the CTA buttons above.
			const cx = W * 0.66;
			const cy = H * 0.84; // ground contact line
			const cw = W * 0.145;
			const ch = cw * 0.34;

			const shoulderY = cy - ch * 0.62; // top of the body / base of the cabin
			const sillY = cy - ch * 0.04; // bottom of the body
			const roofY = cy - ch * 1.12;

			// Contact shadow, then the magenta under-glow bouncing off the grid.
			c.save();
			c.translate(cx, cy);
			c.scale(1, 0.26);
			const sg = c.createRadialGradient(0, 0, 0, 0, 0, cw * 0.52);
			sg.addColorStop(0, "rgba(0,0,0,0.72)");
			sg.addColorStop(1, "rgba(0,0,0,0)");
			c.fillStyle = sg;
			c.fillRect(-cw, -cw, cw * 2, cw * 2);
			const ug = c.createRadialGradient(0, 0, 0, 0, 0, cw * 0.9);
			ug.addColorStop(0, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0.2)`);
			ug.addColorStop(1, "rgba(0,0,0,0)");
			c.fillStyle = ug;
			c.fillRect(-cw, -cw, cw * 2, cw * 2);
			c.restore();

			// Warm pool thrown onto the grid by the tail lights.
			c.save();
			c.translate(cx, cy + ch * 0.12);
			c.scale(1, 0.2);
			const tp = c.createRadialGradient(0, 0, 0, 0, 0, cw * 0.62);
			tp.addColorStop(0, "rgba(255,90,40,0.35)");
			tp.addColorStop(1, "rgba(255,90,40,0)");
			c.fillStyle = tp;
			c.fillRect(-cw, -cw, cw * 2, cw * 2);
			c.restore();

			// Wheels peeking out under the sills.
			c.fillStyle = "#05020c";
			roundedRect(c, cx - cw * 0.49, cy - ch * 0.2, cw * 0.14, ch * 0.24, ch * 0.06);
			c.fill();
			roundedRect(c, cx + cw * 0.35, cy - ch * 0.2, cw * 0.14, ch * 0.24, ch * 0.06);
			c.fill();

			// Body: wide trapezoid, lit from above so it separates from the floor.
			const bodyG = c.createLinearGradient(0, shoulderY, 0, sillY);
			bodyG.addColorStop(0, "#3d1f56");
			bodyG.addColorStop(0.4, "#241134");
			bodyG.addColorStop(1, "#0d0715");
			c.beginPath();
			c.moveTo(cx - cw * 0.5, sillY);
			c.lineTo(cx - cw * 0.47, shoulderY);
			c.lineTo(cx + cw * 0.47, shoulderY);
			c.lineTo(cx + cw * 0.5, sillY);
			c.closePath();
			c.fillStyle = bodyG;
			c.fill();

			// Cabin: pillars first, then the sloped rear window inset.
			c.beginPath();
			c.moveTo(cx - cw * 0.34, shoulderY);
			c.lineTo(cx - cw * 0.21, roofY);
			c.lineTo(cx + cw * 0.21, roofY);
			c.lineTo(cx + cw * 0.34, shoulderY);
			c.closePath();
			c.fillStyle = "#1a0c24";
			c.fill();

			const winG = c.createLinearGradient(0, roofY + ch * 0.06, 0, shoulderY - ch * 0.06);
			winG.addColorStop(0, "#331a4a");
			winG.addColorStop(1, "#0d0718");
			c.beginPath();
			c.moveTo(cx - cw * 0.29, shoulderY - ch * 0.06);
			c.lineTo(cx - cw * 0.18, roofY + ch * 0.06);
			c.lineTo(cx + cw * 0.18, roofY + ch * 0.06);
			c.lineTo(cx + cw * 0.29, shoulderY - ch * 0.06);
			c.closePath();
			c.fillStyle = winG;
			c.fill();

			// Rear spoiler on two short stalks, drawn over the cabin so it reads as
			// standing on the deck in front of the glass.
			c.fillStyle = "#1c0d28";
			c.fillRect(cx - cw * 0.4, shoulderY - ch * 0.16, cw * 0.04, ch * 0.16);
			c.fillRect(cx + cw * 0.36, shoulderY - ch * 0.16, cw * 0.04, ch * 0.16);
			roundedRect(c, cx - cw * 0.45, shoulderY - ch * 0.24, cw * 0.9, ch * 0.09, ch * 0.03);
			c.fill();

			// Recessed housing the tail bar sits in.
			roundedRect(c, cx - cw * 0.46, cy - ch * 0.5, cw * 0.92, ch * 0.19, ch * 0.05);
			c.fillStyle = "#0a0410";
			c.fill();

			// Tail-light bar: soft halo, then the glowing bar (shadowBlur is fine
			// here — this renders once per resize, never per frame).
			const barY = cy - ch * 0.46;
			const barH = ch * 0.11;
			const barG = c.createLinearGradient(cx - cw * 0.42, 0, cx + cw * 0.42, 0);
			barG.addColorStop(0, "#ff8a3c");
			barG.addColorStop(0.5, "#ff2f22");
			barG.addColorStop(1, "#ff8a3c");
			c.save();
			c.shadowColor = "#ff4a2a";
			c.shadowBlur = cw * 0.07;
			roundedRect(c, cx - cw * 0.42, barY, cw * 0.84, barH, barH / 2);
			c.fillStyle = barG;
			c.fill();
			c.fill();
			c.restore();

			// Bumper: darker band under the lights with a plate hint.
			c.fillStyle = "#0b0512";
			c.fillRect(cx - cw * 0.48, cy - ch * 0.24, cw * 0.96, ch * 0.2);
			c.fillStyle = "rgba(255,150,90,0.25)";
			c.fillRect(cx - cw * 0.09, cy - ch * 0.2, cw * 0.18, ch * 0.11);

			// Rim highlights: roof, shoulder and sill catch the sunset behind.
			c.lineWidth = 1.2;
			c.strokeStyle = `rgba(${rgbV.r},${rgbV.g},${rgbV.b},0.5)`;
			c.beginPath();
			c.moveTo(cx - cw * 0.21, roofY);
			c.lineTo(cx + cw * 0.21, roofY);
			c.stroke();
			c.beginPath();
			c.moveTo(cx - cw * 0.47, shoulderY);
			c.lineTo(cx + cw * 0.47, shoulderY);
			c.moveTo(cx - cw * 0.45, shoulderY - ch * 0.24);
			c.lineTo(cx + cw * 0.45, shoulderY - ch * 0.24);
			c.stroke();
			c.strokeStyle = `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0.4)`;
			c.beginPath();
			c.moveTo(cx - cw * 0.34, shoulderY);
			c.lineTo(cx - cw * 0.21, roofY);
			c.moveTo(cx + cw * 0.34, shoulderY);
			c.lineTo(cx + cw * 0.21, roofY);
			c.stroke();
			c.strokeStyle = "rgba(255,120,70,0.35)";
			c.beginPath();
			c.moveTo(cx - cw * 0.46, cy - ch * 0.26);
			c.lineTo(cx + cw * 0.46, cy - ch * 0.26);
			c.stroke();
		}

		function drawVignette(c: CanvasRenderingContext2D) {
			const vig = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
			vig.addColorStop(0, "rgba(0,0,0,0)");
			vig.addColorStop(1, "rgba(0,0,0,0.65)");
			c.fillStyle = vig;
			c.fillRect(0, 0, W, H);
		}

		function renderStaticLayers(): boolean {
			computeMetrics();
			if (W === 0 || H === 0) return false;

			canvas.width = Math.max(1, Math.round(W * dpr));
			canvas.height = Math.max(1, Math.round(H * dpr));
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const rand = mulberry32(1337);
			const b = setupLayer(backLayer);
			drawSky(b);
			drawStars(b, rand);
			drawHaze(b, rand);
			drawSunGlow(b);
			drawSun(b);
			drawMountains(b, rand);
			drawSkyline(b, rand);
			drawWater(b, rand);
			drawFloorBase(b);

			const f = setupLayer(frontLayer);
			drawPalms(f, rand);
			drawCar(f);
			drawVignette(f);

			staticDirty = false;
			return true;
		}

		// ── Per-frame drawing ──────────────────────────────────────────────

		function drawTwinkle(ts: number) {
			for (const s of twinkleStars) {
				ctx.globalAlpha = s.baseAlpha * (0.55 + 0.45 * Math.sin(ts * 0.0012 + s.phase));
				ctx.fillStyle = "#e8e6ff";
				ctx.fillRect(s.x, s.y, s.size, s.size);
			}
			ctx.globalAlpha = 1;
		}

		function drawShimmer(ts: number) {
			ctx.lineWidth = 1.5;
			for (const l of shimmerLines) {
				const wobble = W * 0.01 * Math.sin(ts * 0.0008 + l.phase);
				ctx.globalAlpha = 0.2 + 0.32 * (0.5 + 0.5 * Math.sin(ts * 0.001 + l.phase * 2));
				ctx.strokeStyle = "rgba(255,200,130,1)";
				ctx.beginPath();
				ctx.moveTo(l.xc - l.len / 2 + wobble, l.y);
				ctx.lineTo(l.xc + l.len / 2 + wobble, l.y);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		}

		function drawGrid(ts: number) {
			const slotSize = gridFloorH / horizontalLines;
			const offset = reducedMotion ? 0 : (ts * speed * 0.05) % slotSize;
			const spread = W * 0.7;

			// Vertical lines — fan out from the vanishing point. Each line is
			// stroked twice for bloom: a wide faint pass under a bright core.
			for (let i = 0; i <= verticalLines; i++) {
				const t = i / verticalLines;
				const bottomX = vpX - spread / 2 + t * spread;
				const alpha = 0.15 + 0.55 * (1 - Math.abs(t - 0.5) * 2);
				const lineGrad = ctx.createLinearGradient(vpX, gridHorizonY, bottomX, H);
				lineGrad.addColorStop(0, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},0)`);
				lineGrad.addColorStop(0.3, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},${alpha * 0.6})`);
				lineGrad.addColorStop(1, `rgba(${rgbV.r},${rgbV.g},${rgbV.b},${alpha})`);
				ctx.strokeStyle = lineGrad;
				ctx.beginPath();
				ctx.moveTo(vpX, gridHorizonY);
				ctx.lineTo(bottomX, H);
				ctx.globalAlpha = 0.22;
				ctx.lineWidth = 3;
				ctx.stroke();
				ctx.globalAlpha = 1;
				ctx.lineWidth = 1;
				ctx.stroke();
			}

			// Horizontal lines — perspective-spaced, scrolled by the offset.
			for (let i = 1; i <= horizontalLines + 1; i++) {
				const slot = slotSize > 0 ? i - offset / slotSize : i;
				if (slot <= 0) continue;
				const tz = Math.min(1, slot / horizontalLines);
				const screenY = gridHorizonY + gridFloorH * (1 - Math.pow(1 - tz, 2.2));
				if (screenY > H + 2) continue;

				const progress = (screenY - gridHorizonY) / gridFloorH;
				const lineLeft = vpX - (spread / 2) * progress;
				const lineRight = vpX + (spread / 2) * progress;
				const alpha = 0.08 + 0.7 * progress;

				const hGrad = ctx.createLinearGradient(lineLeft, screenY, lineRight, screenY);
				hGrad.addColorStop(0, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0)`);
				hGrad.addColorStop(0.2, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${alpha})`);
				hGrad.addColorStop(0.5, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${Math.min(1, alpha * 1.3)})`);
				hGrad.addColorStop(0.8, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},${alpha})`);
				hGrad.addColorStop(1, `rgba(${rgbH.r},${rgbH.g},${rgbH.b},0)`);
				ctx.strokeStyle = hGrad;
				ctx.beginPath();
				ctx.moveTo(lineLeft, screenY);
				ctx.lineTo(lineRight, screenY);
				ctx.globalAlpha = 0.25;
				ctx.lineWidth = 2.5 + progress;
				ctx.stroke();
				ctx.globalAlpha = 1;
				ctx.lineWidth = progress < 0.3 ? 0.5 : 1;
				ctx.stroke();
			}
		}

		function composeFrame(ts: number) {
			if (W === 0 || H === 0) return;
			ctx.drawImage(backLayer, 0, 0, backLayer.width, backLayer.height, 0, 0, W, H);
			drawTwinkle(reducedMotion ? 0 : ts);
			drawShimmer(reducedMotion ? 0 : ts);
			drawGrid(ts);
			ctx.drawImage(frontLayer, 0, 0, frontLayer.width, frontLayer.height, 0, 0, W, H);
		}

		function loop(ts: number) {
			if (staticDirty && !renderStaticLayers()) {
				// Canvas has no size yet (hidden/collapsed) — retry next frame.
				raf = requestAnimationFrame(loop);
				return;
			}
			composeFrame(ts);
			raf = requestAnimationFrame(loop);
		}

		function renderStaticFrame() {
			if (renderStaticLayers()) composeFrame(0);
		}

		const onMotionChange = (e: MediaQueryListEvent) => {
			reducedMotion = e.matches;
			cancelAnimationFrame(raf);
			if (reducedMotion) renderStaticFrame();
			else raf = requestAnimationFrame(loop);
		};
		motionQuery.addEventListener("change", onMotionChange);

		const resizeObserver = new ResizeObserver(() => {
			// Rebuilding the layers is a few ms — coalesce into the next frame
			// while animating; render synchronously when no loop is running.
			staticDirty = true;
			if (reducedMotion) renderStaticFrame();
		});
		resizeObserver.observe(canvas);

		if (reducedMotion) renderStaticFrame();
		else raf = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			motionQuery.removeEventListener("change", onMotionChange);
		};
	});
</script>

<canvas bind:this={canvas} class="absolute inset-0 h-full w-full {className}" aria-hidden="true"
></canvas>
