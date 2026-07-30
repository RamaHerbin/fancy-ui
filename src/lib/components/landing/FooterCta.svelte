<script lang="ts">
	import SynthwaveScene from "$lib/components/landing/synthwave/SynthwaveScene.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";

	const GITHUB_URL = "https://github.com/RamaHerbin/fancy-ui";
	const DEMO_URL = "/docs/components";
	const DOCS_URL = "/docs";

	const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] =
		[
			{
				title: "Docs",
				links: [
					{ label: "Getting Started", href: `${DOCS_URL}/getting-started/introduction` },
					{ label: "Components", href: DEMO_URL },
					{ label: "Theming", href: `${DOCS_URL}/getting-started/theming` },
					{ label: "Installation", href: `${DOCS_URL}/getting-started/installation` },
				],
			},
			{
				title: "Resources",
				links: [
					{ label: "Theme Generator", href: `${DOCS_URL}/getting-started/theme-generator` },
					{ label: "llms.txt", href: "/llms.txt" },
					{ label: "GitHub", href: GITHUB_URL, external: true },
					{ label: "Changelog", href: `${DOCS_URL}/getting-started/changelog` },
				],
			},
			{
				title: "Community",
				links: [
					{ label: "Contribute", href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`, external: true },
					{ label: "Issues", href: `${GITHUB_URL}/issues`, external: true },
					{ label: "Discussions", href: `${GITHUB_URL}/discussions`, external: true },
					{ label: "Sponsors", href: "https://github.com/sponsors/RamaHerbin", external: true },
				],
			},
		];

	const year = new Date().getFullYear();
</script>

<!--
	Final CTA + footer, both sitting on the synthwave scene: the layered DOM
	scene is the backdrop for the whole block, so the grid runs behind the link
	columns instead of stopping at the CTA.
-->
<section class="relative overflow-hidden bg-black">
	<SynthwaveScene />

	<!-- CTA -->
	<div class="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 py-24">
		<div class="flex flex-col items-center gap-4 text-center">
			<h2 class="text-3xl font-extrabold tracking-tight text-white sm:text-[38px]">
				Ready to build something
				<span class="bg-gradient-to-r from-[#a78bfa] to-[#5b8cff] bg-clip-text text-transparent"
					>amazing?</span
				>
			</h2>
			<p class="text-sm text-white/60 sm:text-[14.5px]">
				Join developers building beautiful apps with FancyUI.
			</p>
			<div class="mt-3 flex flex-wrap items-center justify-center gap-3.5">
				<a
					href={DOCS_URL}
					class="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] px-6.5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(91,140,255,.4)] transition-shadow hover:shadow-[0_8px_38px_rgba(91,140,255,.6)]"
				>
					Get Started <span aria-hidden="true">→</span>
				</a>
				<a
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-[#13131a]/70 px-6.5 py-3.5 text-sm font-medium text-[#e6e9ef] transition-colors hover:border-white/25"
				>
					<span class="text-[#fbbf24]" aria-hidden="true">★</span> Star on GitHub
				</a>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<!--
		The scrim is deliberately heavy: the scene's brightest features (sun glow,
		car tail-lights) sit right behind these link columns and wash the text out
		at lower opacities.
	-->
	<footer
		class="relative z-10 border-t border-white/7 bg-black/70 px-6 pt-12 backdrop-blur-md sm:px-14"
	>
		<div class="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-16">
			<div class="flex w-full flex-col gap-3.5 lg:w-[300px]">
				<span class="text-lg font-bold text-white">Fancy<span class="text-[#8b7bff]">UI</span></span
				>
				<span class="text-[13px] leading-relaxed text-[#9aa3b2]">
					A modern component library for Svelte 5.
				</span>
				<a
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex w-fit items-center gap-2 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-[#cbd5e1] transition-colors hover:border-white/25"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path
							d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
						/>
					</svg>
					Star
					<GitHubStars class="border-l border-white/15 pl-2 font-mono text-[#9aa3b2]" />
				</a>
			</div>

			<div class="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
				{#each columns as column (column.title)}
					<div class="flex flex-col gap-2.5 text-[13px]">
						<span class="mb-1 font-semibold text-white">{column.title}</span>
						{#each column.links as link (link.label)}
							<a
								href={link.href}
								target={link.external ? "_blank" : undefined}
								rel={link.external ? "noopener noreferrer" : undefined}
								class="text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
							>
								{link.label}
							</a>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<div
			class="mx-auto mt-10 flex max-w-6xl flex-col gap-3 border-t border-white/6 py-4.5 text-xs text-[#8b93ab] sm:flex-row sm:items-center sm:justify-between"
		>
			<span>© {year} FancyUI. Built with Svelte 5 and lots of ☕</span>
			<span class="flex gap-5">
				<a
					href="{GITHUB_URL}/blob/main/LICENSE"
					target="_blank"
					rel="noopener noreferrer"
					class="transition-colors hover:text-[#e6e9ef]">MIT License</a
				>
				<a
					href="{GITHUB_URL}/blob/main/README.md"
					target="_blank"
					rel="noopener noreferrer"
					class="transition-colors hover:text-[#e6e9ef]">README</a
				>
			</span>
		</div>
	</footer>
</section>
