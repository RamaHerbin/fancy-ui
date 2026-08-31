import {
	useEffect,
	useMemo,
	useRef,
	type CSSProperties,
	type MouseEvent,
	type ReactNode,
} from "react";
import { cn } from "../../utils.js";
import "./bg-stars.css";

export interface StarsBackgroundProps {
	/**
	 * Parallax factor for mouse movement (default: 0.05)
	 */
	factor?: number;
	/**
	 * Base animation speed in seconds (default: 50)
	 */
	speed?: number;
	/**
	 * Spring stiffness for parallax (default: 50)
	 */
	stiffness?: number;
	/**
	 * Spring damping for parallax (default: 20)
	 */
	damping?: number;
	/**
	 * Color of the stars (default: #fff)
	 */
	starColor?: string;
	/**
	 * Seed for the star layout. The same seed always produces the same sky.
	 * The Svelte side scatters stars with `Math.random()` in a client-only
	 * effect; a render-path `Math.random()` would differ between a server
	 * render and its hydration, so the port derives the layout from a
	 * deterministic PRNG instead (default: 1).
	 */
	seed?: number;
	/**
	 * Additional CSS classes
	 */
	className?: string;
	/**
	 * Child content to render over the stars
	 */
	children?: ReactNode;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: the star field renders in the render path, so its output must be
 * identical between a server render and its hydration. A seed keeps both
 * renders identical AND keeps the sky stable across unrelated re-renders.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function generateStars(count: number, color: string, random: () => number): string {
	const shadows: string[] = [];
	for (let i = 0; i < count; i++) {
		const x = Math.floor(random() * 4000) - 2000;
		const y = Math.floor(random() * 4000) - 2000;
		shadows.push(`${x}px ${y}px ${color}`);
	}
	return shadows.join(", ");
}

export function StarsBackground({
	factor = 0.05,
	speed = 50,
	stiffness = 50,
	damping = 20,
	starColor = "#fff",
	seed = 1,
	className,
	children,
}: StarsBackgroundProps) {
	// Star box-shadows. The Svelte source regenerates them in an effect keyed
	// on `starColor`; here they are derived on the same dependency (plus the
	// seed that replaces `Math.random()`), so an unrelated re-render never
	// reshuffles the sky.
	const [boxShadow1, boxShadow2, boxShadow3] = useMemo(() => {
		const random = mulberry32(seed);
		return [
			generateStars(1000, starColor, random),
			generateStars(400, starColor, random),
			generateStars(200, starColor, random),
		];
	}, [starColor, seed]);

	// Spring animation state. Per-frame values never round-trip through React
	// state — the loop writes `transform` straight onto the parallax element,
	// exactly where the Svelte template binds `style:transform`.
	const parallaxEl = useRef<HTMLDivElement | null>(null);
	const target = useRef({ x: 0, y: 0 });
	const velocity = useRef({ x: 0, y: 0 });
	const spring = useRef({ x: 0, y: 0 });
	const factorRef = useRef(factor);
	factorRef.current = factor;

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		target.current.x = -(e.clientX - centerX) * factorRef.current;
		target.current.y = -(e.clientY - centerY) * factorRef.current;
	}

	// The spring loop. Spring position and velocity live in refs, so a restart
	// on a stiffness/damping change (its only actual inputs) resumes from the
	// in-flight position instead of snapping back to rest.
	useEffect(() => {
		let animationFrame: number;

		function updateSpring() {
			// Simple spring physics
			const forceX = (target.current.x - spring.current.x) * (stiffness / 1000);
			const forceY = (target.current.y - spring.current.y) * (stiffness / 1000);

			velocity.current.x = velocity.current.x * (1 - damping / 100) + forceX;
			velocity.current.y = velocity.current.y * (1 - damping / 100) + forceY;

			spring.current.x += velocity.current.x;
			spring.current.y += velocity.current.y;

			if (parallaxEl.current) {
				parallaxEl.current.style.transform = `translate(${spring.current.x}px, ${spring.current.y}px)`;
			}

			animationFrame = requestAnimationFrame(updateSpring);
		}

		animationFrame = requestAnimationFrame(updateSpring);

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	}, [stiffness, damping]);

	// Derived CSS custom properties for animation durations
	const layer1Duration = `${speed}s`;
	const layer2Duration = `${speed * 2}s`;
	const layer3Duration = `${speed * 3}s`;

	return (
		<div
			className={cn(
				// `fancy-bg-stars` is a port-added anchor for the colocated CSS
				// (PORTING.md, styling rule 2). Not the bare slug: tailwind-merge
				// classifies a `bg-*` token as a background class and would drop
				// it against a consumer-supplied `bg-*` override.
				"fancy-bg-stars relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
				className
			)}
			onMouseMove={handleMouseMove}
		>
			<div
				ref={parallaxEl}
				className="stars-parallax"
				style={{ transform: "translate(0px, 0px)" }}
			>
				{/* Star Layer 1 (smallest, fastest) */}
				<div className="star-layer" style={{ "--duration": layer1Duration } as CSSProperties}>
					<div
						className="star-field"
						style={{ width: "1px", height: "1px", boxShadow: boxShadow1 }}
					></div>
					<div
						className="star-field top-[2000px]"
						style={{ width: "1px", height: "1px", boxShadow: boxShadow1 }}
					></div>
				</div>

				{/* Star Layer 2 (medium) */}
				<div className="star-layer" style={{ "--duration": layer2Duration } as CSSProperties}>
					<div
						className="star-field"
						style={{ width: "2px", height: "2px", boxShadow: boxShadow2 }}
					></div>
					<div
						className="star-field top-[2000px]"
						style={{ width: "2px", height: "2px", boxShadow: boxShadow2 }}
					></div>
				</div>

				{/* Star Layer 3 (largest, slowest) */}
				<div className="star-layer" style={{ "--duration": layer3Duration } as CSSProperties}>
					<div
						className="star-field"
						style={{ width: "3px", height: "3px", boxShadow: boxShadow3 }}
					></div>
					<div
						className="star-field top-[2000px]"
						style={{ width: "3px", height: "3px", boxShadow: boxShadow3 }}
					></div>
				</div>
			</div>

			{/* Child content over the stars */}
			{children}
		</div>
	);
}
