<script lang="ts">
	interface Props {
		slug: string;
	}

	let { slug }: Props = $props();

	let ComponentModule = $state<any>(null);
	let ExampleComponent = $state<any>(null);
	let loading = $state(true);
	let error = $state("");

	const modules = import.meta.glob("$lib/fancy-ui/*/index.ts");
	const exampleModules = import.meta.glob("$lib/components/docs/examples/**/BasicUsage.svelte");

	$effect(() => {
		const currentSlug = slug;
		ComponentModule = null;
		ExampleComponent = null;
		loading = true;
		error = "";

		if (skipDirectRender.has(currentSlug)) {
			// Load first example (BasicUsage) as preview
			const exPath = `/src/lib/components/docs/examples/${currentSlug}/BasicUsage.svelte`;
			const exLoader = exampleModules[exPath];
			if (exLoader) {
				exLoader()
					.then((mod) => {
						if (slug === currentSlug) {
							ExampleComponent = (mod as any).default;
							loading = false;
						}
					})
					.catch(() => {
						if (slug === currentSlug) {
							loading = false;
						}
					});
			} else {
				loading = false;
			}
			return;
		}

		const path = `/src/lib/fancy-ui/${currentSlug}/index.ts`;
		const loader = modules[path];
		if (!loader) {
			error = `No module found for "${currentSlug}"`;
			loading = false;
			return;
		}

		loader()
			.then((mod) => {
				if (slug === currentSlug) {
					ComponentModule = mod;
					loading = false;
				}
			})
			.catch((e) => {
				if (slug === currentSlug) {
					error = `Failed to load: ${e}`;
					loading = false;
				}
			});
	});

	// Component name mapping (slug → export name)
	const componentNames: Record<string, string> = {
		"apple-card-carousel": "AppleCardCarousel",
		"animated-beam": "AnimatedBeam",
		"animated-testimonials": "AnimatedTestimonials",
		"bg-falling-stars": "FallingStarsBg",
		"animated-tooltip": "AnimatedTooltip",
		"blur-reveal": "BlurReveal",
		"border-beam": "BorderBeam",
		compare: "Compare",
		"image-trail-cursor": "ImageTrailCursor",
		"interactive-grid-pattern": "InteractiveGridPattern",
		"line-hover-link": "LineHoverLink",
		"logo-cloud": "LogoCloud",
		"direction-aware-hover": "DirectionAwareHover",
		"rainbow-button": "RainbowButton",
		"ripple-button": "RippleButton",
		"shimmer-button": "ShimmerButton",
		timeline: "Timeline",
		"bg-stars": "StarsBackground",
		dock: "Dock",
		"fluid-cursor": "FluidCursor",
		"glow-border": "GlowBorder",
		"gradient-button": "GradientButton",
		"interactive-hover-button": "InteractiveHoverButton",
		marquee: "Marquee",
		meteors: "Meteors",
		"flickering-grid": "FlickeringGrid",
		"neon-border": "NeonBorder",
		"colourful-text": "ColourfulText",
		"flip-words": "FlipWords",
		"hyper-text": "HyperText",
		"letter-pullup": "LetterPullup",
		"number-ticker": "NumberTicker",
		"sparkles-text": "SparklesText",
		"box-reveal": "BoxReveal",
		"card-3d": "CardContainer",
		"card-spotlight": "CardSpotlight",
		"bento-grid": "BentoGrid",
		"flip-card": "FlipCard",
		book: "Book",
		"glare-card": "GlareCard",
		"text-reveal-card": "TextRevealCard",
		"container-scroll": "ContainerScroll",
		"container-text-flip": "ContainerTextFlip",
		focus: "Focus",
		"liquid-glass": "LiquidGlass",
		"smooth-cursor": "SmoothCursor",
		"glowing-effect": "GlowingEffect",
		sparkles: "Sparkles",
		confetti: "ConfettiButton",
		ripple: "Ripple",
		"text-generate-effect": "TextGenerateEffect",
		"line-shadow-text": "LineShadowText",
		"tracing-beam": "TracingBeam",
		"displacement-text": "DisplacementText",
		"matrix-rain": "MatrixRain",
		"terminal-text": "TerminalText",
	};

	// Default props per slug
	const defaultProps: Record<string, Record<string, any>> = {
		"flip-words": { words: ["beautiful", "animated", "interactive", "composable"] },
		focus: { sentence: "Build beautiful interfaces with FancyUI" },
		"hyper-text": { text: "Hover Me!" },
		"colourful-text": { text: "Colourful" },
		"sparkles-text": { text: "Sparkles", sparklesCount: 8 },
		"letter-pullup": { words: "Letter Pullup" },
		"line-shadow-text": { text: "Shadow" },
		"text-generate-effect": { words: "The quick brown fox jumps over the lazy dog" },
		"number-ticker": { value: 1234 },
		"terminal-text": { lines: ["$ npm install fancy-ui", "Installing...", "Done!"] },
		"container-text-flip": { words: ["better", "faster", "stronger", "beautiful"] },
		"displacement-text": { text: "Hover Me" },
		"flickering-grid": { color: "#6366f1", maxOpacity: 0.2, squareSize: 4, gridGap: 6 },
		sparkles: { background: "transparent", particleColor: "#ffffff", particleDensity: 60 },
		"matrix-rain": { color: "#00ff00" },
		"border-beam": { colorFrom: "#9E7AFF", colorTo: "#FE8BBB", size: 200 },
		ripple: {},
		meteors: { count: 15 },
		"glow-border": {},
		"neon-border": {},
		"glowing-effect": { disabled: false },
		"interactive-grid-pattern": { width: 60, height: 60 },
		"interactive-hover-button": { text: "Hover Me" },
	};

	// Components that we skip direct render (need too much setup)
	const skipDirectRender = new Set([
		"animated-beam",
		"apple-card-carousel",
		"animated-testimonials",
		"animated-tooltip",
		"compare",
		"direction-aware-hover",
		"logo-cloud",
		"image-trail-cursor",
		"timeline",
		"dock",
		"bento-grid",
		"card-3d",
		"flip-card",
		"book",
		"text-reveal-card",
		"container-scroll",
		"tracing-beam",
		"fluid-cursor",
		"smooth-cursor",
		"liquid-glass",
		"noise-reveal",
		"line-reveal",
		"editorial-engine",
		"frosted-glass",
		"liquid-text",
	]);

	function getComponent() {
		if (!ComponentModule) return null;
		const name = componentNames[slug];
		return name ? ComponentModule[name] : null;
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<div
			class="border-muted-foreground size-6 animate-spin rounded-full border-2 border-t-transparent"
		></div>
	</div>
{:else if error}
	<div class="text-muted-foreground flex h-64 items-center justify-center text-sm">
		{error}
	</div>
{:else if skipDirectRender.has(slug)}
	{#if ExampleComponent}
		<ExampleComponent />
	{:else}
		<div class="text-muted-foreground flex h-64 items-center justify-center text-sm">
			No preview available
		</div>
	{/if}
{:else}
	{@const Comp = getComponent()}
	{@const props = defaultProps[slug] || {}}
	{#if Comp}
		<!-- Simple or needs-props: render with defaults -->
		{#if slug === "rainbow-button"}
			<Comp {...props}>Rainbow Button</Comp>
		{:else if slug === "shimmer-button"}
			<Comp {...props}>Shimmer Button</Comp>
		{:else if slug === "ripple-button"}
			<Comp {...props}>Ripple Button</Comp>
		{:else if slug === "gradient-button"}
			<Comp {...props}>Gradient Button</Comp>
		{:else if slug === "confetti"}
			<Comp {...props}
				><button class="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium"
					>Click for Confetti</button
				></Comp
			>
		{:else if slug === "box-reveal"}
			<Comp color="var(--primary)" duration={0.5}>
				<h2 class="text-foreground text-2xl font-bold">Box Reveal</h2>
			</Comp>
		{:else if slug === "blur-reveal"}
			<Comp>
				<h2 class="text-foreground text-2xl font-bold">Blur Reveal Effect</h2>
				<p class="text-muted-foreground">Content fades in from blur as you scroll.</p>
			</Comp>
		{:else if slug === "card-spotlight"}
			<Comp class="h-64 w-80">
				<div class="relative z-20 p-6">
					<h3 class="text-foreground text-lg font-bold">Card Spotlight</h3>
					<p class="text-muted-foreground mt-2 text-sm">Mouse-following radial gradient effect.</p>
				</div>
			</Comp>
		{:else if slug === "glare-card"}
			<Comp>
				<div class="flex h-full items-center justify-center p-6">
					<p class="text-foreground text-lg font-bold">Glare Card</p>
				</div>
			</Comp>
		{:else if slug === "neon-border"}
			<Comp {...props}>
				<div class="rounded-xl p-8 text-center">
					<p class="text-foreground font-semibold">Neon Border</p>
				</div>
			</Comp>
		{:else if slug === "marquee"}
			<Comp pauseOnHover class="[--duration:20s]">
				{#each ["Svelte 5", "Tailwind v4", "TypeScript", "Animations", "GSAP", "MIT License"] as badge}
					<span
						class="bg-muted text-muted-foreground mx-2 rounded-full border px-3 py-1 text-xs font-medium"
					>
						{badge}
					</span>
				{/each}
			</Comp>
		{:else if slug === "line-hover-link"}
			<div class="flex flex-col gap-4">
				<Comp href="#" variant="underline-left">Underline Left</Comp>
				<Comp href="#" variant="underline-center">Underline Center</Comp>
				<Comp href="#" variant="underline-right">Underline Right</Comp>
			</div>
		{:else}
			<!-- Default: render with props, no children -->
			<Comp {...props} />
		{/if}
	{:else}
		<div class="text-muted-foreground flex h-64 items-center justify-center text-sm">
			Component not found in module
		</div>
	{/if}
{/if}
