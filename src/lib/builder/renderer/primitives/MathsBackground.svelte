<script lang="ts">
	interface Props {
		density?: number;
		class?: string;
	}

	let { density = 20, class: className = "" }: Props = $props();

	const mathFormulas = [
		"∂u/∂t + div(f(u)) = 0",
		"∫₋∞^∞ e^(-x²) dx = √π",
		"∇²u = 0",
		"∂²u/∂t² = c²∇²u",
		"∑ₙ₌₁^∞ 1/n² = π²/6",
		"∮_C F·dr = ∬_S (∇×F)·dS",
		"lim_{h→0} [f(x+h)-f(x)]/h",
		"∫∫∫_V ∇·F dV = ∮_∂V F·n dS",
		"∂u/∂x + ∂v/∂y = 0",
		"E = mc²",
		"∇·E = ρ/ε₀",
		"∂ₜu + u·∇u = -∇p + ν∇²u",
		"||u||_{L²} = (∫|u|² dx)^{1/2}",
		"∫₀¹ x^n dx = 1/(n+1)",
		"det(A) = ∑ᵨ sgn(σ)∏aᵢ,σ(ᵢ)",
		"∇f = ∂f/∂x î + ∂f/∂y ĵ + ∂f/∂z k̂",
		"∫ e^x dx = e^x + C",
		"∂/∂x[f(g(x))] = f'(g(x))g'(x)",
		"∑ₖ₌₀^n (n k) x^k y^{n-k} = (x+y)^n",
		"∇×(∇×F) = ∇(∇·F) - ∇²F",
	];

	const symbols = [
		"∂",
		"∇",
		"∫",
		"∑",
		"∞",
		"π",
		"α",
		"β",
		"γ",
		"δ",
		"λ",
		"μ",
		"σ",
		"φ",
		"ψ",
		"Ω",
		"θ",
		"ε",
	];

	function seededRandom(seed: number) {
		let x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}

	type FloatingEl = { text: string; style: string };

	let formulaEls = $derived(
		mathFormulas.slice(0, density).map((text, index) => {
			const seed = index * 123.456;
			const rotation = seededRandom(seed) * 30 - 15;
			return {
				text,
				style: `left:${seededRandom(seed + 1) * 120 - 10}%;top:${seededRandom(seed + 2) * 120 - 10}%;font-size:${seededRandom(seed + 3) * 6 + 8}px;animation:mathsBgFloat ${40 + seededRandom(seed + 4)}s linear infinite;animation-delay:${seededRandom(seed + 5) * -60}s;--rotation:${rotation}deg;transform:rotate(${rotation}deg)`,
			};
		})
	);

	let symbolEls = $derived(
		Array.from({ length: density * 2 }).map((_, index) => {
			const seed = (index + mathFormulas.length) * 789.012;
			const rotation = seededRandom(seed) * 360;
			return {
				text: symbols[Math.floor(seededRandom(seed + 1) * symbols.length)],
				style: `left:${seededRandom(seed + 2) * 120 - 10}%;top:${seededRandom(seed + 3) * 120 - 10}%;font-size:${seededRandom(seed + 4) * 15 + 15}px;animation:mathsBgFloat ${60 + seededRandom(seed + 5)}s linear infinite reverse;animation-delay:${seededRandom(seed + 6) * -80}s;--rotation:${rotation}deg`,
			};
		})
	);
</script>

<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden {className}">
	<!-- Floating formulas -->
	{#each formulaEls as el}
		<div
			class="text-foreground/20 absolute font-mono text-xs whitespace-nowrap select-none"
			style={el.style}
		>
			{el.text}
		</div>
	{/each}

	<!-- Scattered symbols -->
	{#each symbolEls as el}
		<div class="text-foreground/15 absolute font-serif select-none" style={el.style}>
			{el.text}
		</div>
	{/each}

	<!-- Grid pattern -->
	<div class="absolute inset-0 opacity-[0.05]">
		<svg width="100%" height="100%" class="absolute inset-0">
			<defs>
				<pattern id="mathGrid" width="80" height="80" patternUnits="userSpaceOnUse">
					<path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" stroke-width="0.5" />
					<circle cx="40" cy="40" r="1" fill="currentColor" opacity="0.3" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#mathGrid)" />
		</svg>
	</div>

	<!-- Animated curves -->
	<div class="absolute inset-0 opacity-[0.08]">
		<svg width="100%" height="100%" class="absolute inset-0">
			<path
				d="M0,300 Q150,200 300,300 T600,300 T900,300 T1200,300 T1500,300"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				style="animation: mathsBgPulse 8s ease-in-out infinite"
			/>
			<path
				d="M200,600 Q500,200 800,600"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				opacity="0.5"
				style="animation: mathsBgPulse 12s ease-in-out infinite 2s"
			/>
			<path
				d="M100,500 Q200,400 300,300 Q400,200 500,150 Q600,125 700,110"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				opacity="0.4"
				style="animation: mathsBgPulse 15s ease-in-out infinite 4s"
			/>
		</svg>
	</div>

	<!-- Fractal triangles -->
	<div class="absolute top-10 right-10 opacity-[0.06]">
		<svg width="200" height="200">
			<polygon
				points="100,20 180,180 20,180"
				fill="none"
				stroke="currentColor"
				stroke-width="0.5"
			/>
			<polygon
				points="100,60 140,140 60,140"
				fill="none"
				stroke="currentColor"
				stroke-width="0.5"
			/>
			<polygon
				points="100,100 120,120 80,120"
				fill="none"
				stroke="currentColor"
				stroke-width="0.5"
			/>
		</svg>
	</div>

	<!-- Concentric circles -->
	<div class="absolute bottom-10 left-10 opacity-[0.06]">
		<svg width="150" height="150">
			<circle cx="75" cy="75" r="70" fill="none" stroke="currentColor" stroke-width="0.5" />
			<circle cx="75" cy="75" r="50" fill="none" stroke="currentColor" stroke-width="0.5" />
			<circle cx="75" cy="75" r="30" fill="none" stroke="currentColor" stroke-width="0.5" />
			<circle cx="75" cy="75" r="10" fill="none" stroke="currentColor" stroke-width="0.5" />
		</svg>
	</div>

	<!-- Static symbols -->
	<div class="text-foreground/10 absolute top-20 left-20 font-serif text-4xl select-none">∫</div>
	<div class="text-foreground/[0.08] absolute top-40 right-32 font-mono text-3xl select-none">
		∇²u = 0
	</div>
	<div class="text-foreground/[0.12] absolute bottom-32 left-40 font-serif text-2xl select-none">
		π
	</div>
	<div class="text-foreground/[0.08] absolute top-60 left-1/2 font-mono text-lg select-none">
		∂u/∂t
	</div>
	<div class="text-foreground/10 absolute right-20 bottom-40 font-serif text-xl select-none">∞</div>
</div>

<style>
	:global {
		@keyframes mathsBgFloat {
			0% {
				transform: translateY(0) rotate(var(--rotation));
			}
			50% {
				transform: translateY(-20px) rotate(var(--rotation));
			}
			100% {
				transform: translateY(0) rotate(var(--rotation));
			}
		}

		@keyframes mathsBgPulse {
			0%,
			100% {
				opacity: 0.2;
				transform: scale(1);
			}
			50% {
				opacity: 0.3;
				transform: scale(1.05);
			}
		}
	}
</style>
