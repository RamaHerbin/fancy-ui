import { useEffect, useState } from "react";
import * as THREE from "three";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

/**
 * NoiseReveal - A WebGL image reveal driven by a Perlin-noise dissolve mask.
 *
 * The mask lives entirely in the fragment shader: domain-warped noise plus a
 * radial gradient that contracts as `uProgress` runs 0 -> 1, clamped and
 * inverted into an alpha value. The vertex shader adds a wave displacement that
 * fades out over the same progress. Reveals once on viewport entry, or under
 * full manual control via `revealed`.
 */
export interface NoiseRevealProps {
	/** Image URL */
	src: string;
	/** Accessible label for the image */
	alt?: string;
	/** Reveal trigger: "view" = on viewport entry, "manual" = via `revealed` */
	trigger?: "view" | "manual";
	/** Manual reveal state (used with trigger="manual"; also allows re-hiding) */
	revealed?: boolean;
	/** Reveal animation duration in seconds */
	duration?: number;
	/** Delay before reveal in seconds (trigger="view") */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
}

// The three animation helpers the Svelte source imports from the package's
// shared animation utils, re-typed here: the React package has no port of that
// module, and `internals/motion/easing.ts` carries a different set of curves.
// Bodies are identical to the originals.

/** Interpolate between two values */
function lerp(start: number, end: number, t: number): number {
	return start + (end - start) * t;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Cubic ease in-out */
function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Calculate animation progress based on elapsed time */
function getProgress(elapsed: number, duration: number): number {
	return clamp(elapsed / duration, 0, 1);
}

const vertexShader = `
		uniform float uProgress;
		varying vec2 vUv;

		void main() {
			vec3 newPosition = position;

			float distanceToCenter = distance(vec2(0.5), uv);
			float wave = (1.0 - uProgress) * sin(distanceToCenter * 20.0 - uProgress * 5.0);
			newPosition.z += wave;

			gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
			vUv = uv;
		}
	`;

// cnoise: classic 3D Perlin noise by Stefan Gustavson (MIT, github.com/stegu/webgl-noise)
const fragmentShader = `
		uniform sampler2D uTexture;
		uniform float uTime;
		uniform float uProgress;
		uniform vec2 uRes;
		uniform vec2 uImageRes;
		varying vec2 vUv;

		vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
		vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
		vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

		float cnoise(vec3 P) {
			vec3 Pi0 = floor(P);
			vec3 Pi1 = Pi0 + vec3(1.0);
			Pi0 = mod(Pi0, 289.0);
			Pi1 = mod(Pi1, 289.0);
			vec3 Pf0 = fract(P);
			vec3 Pf1 = Pf0 - vec3(1.0);
			vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
			vec4 iy = vec4(Pi0.yy, Pi1.yy);
			vec4 iz0 = Pi0.zzzz;
			vec4 iz1 = Pi1.zzzz;

			vec4 ixy = permute(permute(ix) + iy);
			vec4 ixy0 = permute(ixy + iz0);
			vec4 ixy1 = permute(ixy + iz1);

			vec4 gx0 = ixy0 / 7.0;
			vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
			gx0 = fract(gx0);
			vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
			vec4 sz0 = step(gz0, vec4(0.0));
			gx0 -= sz0 * (step(0.0, gx0) - 0.5);
			gy0 -= sz0 * (step(0.0, gy0) - 0.5);

			vec4 gx1 = ixy1 / 7.0;
			vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
			gx1 = fract(gx1);
			vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
			vec4 sz1 = step(gz1, vec4(0.0));
			gx1 -= sz1 * (step(0.0, gx1) - 0.5);
			gy1 -= sz1 * (step(0.0, gy1) - 0.5);

			vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
			vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
			vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
			vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
			vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
			vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
			vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
			vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

			vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
			g000 *= norm0.x;
			g010 *= norm0.y;
			g100 *= norm0.z;
			g110 *= norm0.w;
			vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
			g001 *= norm1.x;
			g011 *= norm1.y;
			g101 *= norm1.z;
			g111 *= norm1.w;

			float n000 = dot(g000, Pf0);
			float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
			float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
			float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
			float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
			float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
			float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
			float n111 = dot(g111, Pf1);

			vec3 fade_xyz = fade(Pf0);
			vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
			vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
			float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
			return 2.2 * n_xyz;
		}

		vec2 CoverUV(vec2 u, vec2 s, vec2 i) {
			float rs = s.x / s.y;
			float ri = i.x / i.y;
			vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
			vec2 o = (rs < ri ? vec2((st.x - s.x) / 2.0, 0.0) : vec2(0.0, (st.y - s.y) / 2.0)) / st;
			return u * s / st + o;
		}

		void main() {
			vec2 newUv = CoverUV(vUv, uRes, uImageRes);

			vec2 displacedUv = vUv + cnoise(vec3(vUv * 5.0, uTime * 0.1));
			float strength = cnoise(vec3(displacedUv * 5.0, uTime * 0.2));

			float radialGradient = distance(vUv, vec2(0.5)) * 12.5 - 7.0 * uProgress;
			strength += radialGradient;

			strength = clamp(strength, 0.0, 1.0);
			strength = 1.0 - strength;

			vec3 textureColor = texture2D(uTexture, newUv).rgb;

			float opacityProgress = smoothstep(0.0, 0.7, uProgress);

			gl_FragColor = vec4(textureColor, strength * opacityProgress);
		}
	`;

export function NoiseReveal({
	src,
	alt,
	trigger = "view",
	revealed = false,
	duration = 1.5,
	delay = 0,
	className = "",
}: NoiseRevealProps) {
	const [container, containerRef] = useElementRef<HTMLDivElement>();

	// State, not a ref: the two trigger effects below must re-run the moment the
	// render loop publishes its setter, which is exactly what the source's
	// `$state.raw` buys there.
	const [setTarget, setSetTarget] = useState<((value: number) => void) | null>(null);

	// The source reads `revealed` through `untrack` when it seeds `uProgress`, so
	// a change to it must never rebuild the scene. A live ref reproduces that;
	// `revealed` in the dependency array would dispose and re-create the renderer
	// on every toggle.
	const revealedRef = useLiveRef(revealed);

	// The whole scene is built and torn down inside one effect, exactly as the
	// source's `$effect` does. The dependency array is the set that `$effect`
	// reads reactively: `src` and `duration` are captured into locals at setup,
	// and `trigger` decides the seed value — any of the three changing disposes
	// the old scene and builds a new one.
	useEffect(() => {
		if (!container) return;

		const _src = src;
		const _duration = duration;

		const rect = container.getBoundingClientRect();
		const width = rect.width || 1;
		const height = rect.height || 1;
		// Ported as-is: `|| 1` above already excludes 0, so this guard never
		// fires. Kept so the port and the source stay line-for-line comparable.
		if (height === 0) return;

		const scene = new THREE.Scene();
		scene.background = null;

		const cameraDistance = 5;
		const fov = 50;
		const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 1000);
		camera.position.set(0, 0, cameraDistance);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height, false);
		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";
		container.appendChild(renderer.domElement);

		const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTexture: { value: null },
				uTime: { value: 0 },
				uProgress: { value: trigger === "manual" && revealedRef.current ? 1 : 0 },
				uRes: { value: new THREE.Vector2(1, 1) },
				uImageRes: { value: new THREE.Vector2(1, 1) },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
		});

		const plane = new THREE.Mesh(geometry, material);
		scene.add(plane);

		// Scale the unit plane to exactly fill the camera frustum at z=0.
		// Non-null assertions on `uniforms`: the type definitions declare it as a
		// string index signature, so `noUncheckedIndexedAccess` widens every read
		// to `| undefined`. Every key below is declared in the literal above.
		const fitPlane = (w: number, h: number) => {
			const visibleH = 2 * Math.tan((fov * Math.PI) / 360) * cameraDistance;
			const visibleW = visibleH * (w / h);
			plane.scale.set(visibleW, visibleH, 1);
			(material.uniforms.uRes!.value as THREE.Vector2).set(visibleW, visibleH);
		};
		fitPlane(width, height);

		let texture: THREE.Texture | null = null;
		new THREE.TextureLoader().load(_src, (loaded) => {
			loaded.colorSpace = THREE.SRGBColorSpace;
			texture = loaded;
			material.uniforms.uTexture!.value = loaded;
			const image = loaded.image as HTMLImageElement;
			(material.uniforms.uImageRes!.value as THREE.Vector2).set(
				image.naturalWidth || 1,
				image.naturalHeight || 1
			);
		});

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let progress = material.uniforms.uProgress!.value as number;
		const tween = { from: progress, to: progress, start: 0, active: false };

		const target = (value: number) => {
			if (value === tween.to) return;
			tween.to = value;
			if (reducedMotion) {
				progress = value;
				tween.active = false;
				return;
			}
			tween.from = progress;
			tween.start = performance.now();
			tween.active = true;
		};
		setSetTarget(() => target);

		const handleResize = () => {
			const r = container.getBoundingClientRect();
			if (r.height === 0) return;
			camera.aspect = r.width / r.height;
			camera.updateProjectionMatrix();
			renderer.setSize(r.width, r.height, false);
			fitPlane(r.width, r.height);
		};

		window.addEventListener("resize", handleResize);

		const clock = new THREE.Clock();
		let animationId = 0;
		const animate = () => {
			animationId = requestAnimationFrame(animate);
			if (tween.active) {
				const t = getProgress(performance.now() - tween.start, _duration * 1000);
				progress = lerp(tween.from, tween.to, easeInOutCubic(t));
				if (t >= 1) tween.active = false;
			}
			material.uniforms.uProgress!.value = progress;
			material.uniforms.uTime!.value = clock.getElapsedTime();
			renderer.render(scene, camera);
		};
		animate();

		return () => {
			setSetTarget(null);
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(animationId);
			if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
			texture?.dispose();
		};
	}, [container, src, duration, trigger, revealedRef]);

	// Viewport trigger: reveal once on first intersection
	useEffect(() => {
		if (trigger !== "view" || !container || !setTarget) return;

		const set = setTarget;
		let timeoutId = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						observer.disconnect();
						timeoutId = window.setTimeout(() => set(1), delay * 1000);
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(container);

		return () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};
	}, [trigger, container, setTarget, delay]);

	// Manual trigger: follow the `revealed` prop both ways
	useEffect(() => {
		if (trigger !== "manual" || !setTarget) return;
		setTarget(revealed ? 1 : 0);
	}, [trigger, setTarget, revealed]);

	return (
		<div
			ref={containerRef}
			className={cn("relative h-[400px] w-full", className)}
			role={alt ? "img" : undefined}
			aria-label={alt}
		/>
	);
}
