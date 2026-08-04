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
	Final CTA + footer, both sitting on the synthwave backdrop: the static
	panorama is the backdrop for the whole block, so the grid runs behind the
	link columns instead of stopping at the CTA. The section gradient starts at
	the ValuesStrip's #08080d so the seam above is invisible.
-->
<!--
	No overflow-hidden here: the scene's riser gradient reaches above the
	section top, behind the ValuesStrip card, and the panorama clips its own
	<img>.
-->
<section class="relative bg-gradient-to-b from-[#08080d] to-black">
	<SynthwaveScene />

	<!--
		CTA. The narrow-viewport top padding clears the whole sun disc: below
		640px the backdrop uses the tighter mobile crop, where the disc fills
		most of the width, so the heading starts under it rather than across it.
		From sm up the panorama is wide enough for the heading to sit in the
		sun's upper third, as designed.
	-->
	<div
		class="relative z-10 flex flex-col items-center justify-center px-6 pt-60 pb-20 sm:pt-28 sm:pb-24"
	>
		<!--
			Whisper of a radial scrim behind the CTA text: a tight ellipse hugging
			the text block (capped at 0.15 alpha) so the sun keeps its full
			amber-to-red grade instead of getting washed grey.
		-->
		<div
			class="pointer-events-none absolute top-1/2 left-1/2 h-[100%] w-[min(720px,100%)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.10)_48%,transparent_70%)]"
			aria-hidden="true"
		></div>
		<div class="relative flex flex-col items-center gap-4 text-center">
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
		The scrim is a gradient, not a solid bar: it fades upward to transparent so
		the grid keeps glowing through its top edge, and the scene's bottom
		vignette does the rest of the legibility work behind the link columns.
	-->
	<footer class="relative z-10 px-6 pt-12 sm:px-14">
		<div
			class="pointer-events-none absolute inset-x-0 -top-16 bottom-0 bg-gradient-to-b from-transparent via-black/60 to-black/85"
			aria-hidden="true"
		></div>
		<div class="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-16">
			<!--
				Local floor for link contrast where the columns sit over the car and
				grid glow at wide viewports — confined to the columns block so the
				panorama above keeps its full vividness.
			-->
			<div
				class="pointer-events-none absolute -inset-x-6 -inset-y-4 bg-[linear-gradient(to_top,rgba(5,2,15,0.85),transparent_220px)] [mask-image:linear-gradient(to_right,transparent,black_64px,black_calc(100%-64px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_64px,black_calc(100%-64px),transparent)]"
				aria-hidden="true"
			></div>
			<div class="relative flex w-full flex-col gap-3.5 lg:w-[300px]">
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

			<div class="relative grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
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
			class="relative mx-auto mt-10 flex max-w-6xl flex-col gap-3 border-t border-white/6 py-4.5 text-xs text-[#8b93ab] sm:flex-row sm:items-center sm:justify-between"
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
