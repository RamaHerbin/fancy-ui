<script lang="ts">
	const components = [
		{
			name: 'AnimatedBeam',
			href: '/demo/animated-beam',
			description: 'Animated SVG beams connecting elements with gradient effects',
			status: 'done' as const
		},
		{
			name: 'AnimatedTooltip',
			href: '/demo/animated-tooltip',
			description: 'Avatar row with animated tooltips that follow mouse movement',
			status: 'done' as const
		},
		{
			name: 'BgStars',
			href: '/demo/bg-stars',
			description: 'Animated starfield background with parallax mouse tracking',
			status: 'done' as const
		},
		{
			name: 'BorderBeam',
			href: '/demo/border-beam',
			description: 'Animated beam effect that travels around borders',
			status: 'done' as const
		},
		{
			name: 'Dock',
			href: '/demo/dock',
			description: 'macOS-style dock with icon magnification on hover',
			status: 'done' as const
		},
		{
			name: 'FluidCursor',
			href: '/demo/fluid-cursor',
			description: 'WebGL fluid simulation that follows cursor movement',
			status: 'done' as const
		},
		{
			name: 'GlowBorder',
			href: '/demo/glow-border',
			description: 'Animated glowing border effect with gradient support',
			status: 'done' as const
		},
		{
			name: 'Marquee',
			href: '/demo/marquee',
			description: 'Infinite scrolling component for text, images, or cards',
			status: 'done' as const
		},
		{
			name: 'RainbowButton',
			href: '/demo/rainbow-button',
			description: 'Animated button with a rainbow gradient border effect',
			status: 'done' as const
		},
		{
			name: 'RippleButton',
			href: '/demo/ripple-button',
			description: 'Button with ripple click effect',
			status: 'done' as const
		}
	];
</script>

<svelte:head>
	<title>Components - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-4xl font-bold mb-2">FancyUI</h1>
	<p class="text-muted-foreground mb-8">
		Svelte ports of FancyUI components. Click on any component to see it in action.
	</p>

	<div class="grid gap-4">
		{#each components as component}
			<a
				href={component.href}
				class="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
			>
				<div>
					<h2 class="font-semibold group-hover:text-accent-foreground">
						{component.name}
					</h2>
					<p class="text-sm text-muted-foreground">{component.description}</p>
				</div>
				<div class="flex items-center gap-2">
					{#if component.status === 'done'}
						<span
							class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
						>
							Done
						</span>
					{:else if component.status === 'in-progress'}
						<span
							class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
						>
							In Progress
						</span>
					{:else}
						<span
							class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
						>
							Planned
						</span>
					{/if}
					<svg
						class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</div>
			</a>
		{/each}
	</div>
</div>
