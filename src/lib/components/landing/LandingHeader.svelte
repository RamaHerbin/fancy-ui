<script lang="ts">
	const GITHUB_URL = "https://github.com/ramaherbin/fancy-ui";

	const navLinks: { label: string; href: string }[] = [
		{ label: "Docs", href: "/docs/getting-started/introduction" },
		{ label: "Components", href: "/docs/components" },
		{ label: "Theming", href: "/docs/getting-started/theming" },
		{ label: "Theme Generator", href: "/docs/getting-started/theme-generator" },
		{ label: "Builder", href: "/builder" },
	];
</script>

<header class="sticky top-0 z-50 border-b border-white/8 bg-[#050508]/80 backdrop-blur-md">
	<div
		class="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-8 lg:px-14"
	>
		<a href="/" class="text-[19px] font-bold tracking-[-0.01em] text-white">
			Fancy<span class="text-[#8b7bff]">UI</span>
		</a>

		<nav class="hidden flex-1 items-center justify-center gap-2 text-[13px] md:flex">
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class="rounded-lg px-3.5 py-[7px] text-[#c3cadf] transition-colors hover:text-white"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-3.5">
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub"
				class="flex text-[#8fb8ff] transition-colors hover:text-white"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
					/>
				</svg>
			</a>
			<a
				href="/docs"
				class="rounded-[10px] bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] px-[18px] py-[9px] text-[13px] font-semibold text-white shadow-[0_4px_18px_rgba(91,140,255,0.35)] transition-opacity hover:opacity-90"
			>
				Get Started
			</a>
		</div>
	</div>
</header>
