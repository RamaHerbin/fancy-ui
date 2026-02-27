<script lang="ts">
	import Footer from "$lib/portfolio/sections/Footer.svelte";
</script>

<svelte:head>
	<title>Personal Projects - Rama Herbin</title>
	<meta
		name="description"
		content="Personal projects and creative experiments by Rama Herbin. Portfolio iterations, blog platform, and technical explorations."
	/>
</svelte:head>

<div class="min-h-screen">
	<!-- Hero -->
	<section class="px-6 pt-32 pb-16">
		<div class="mx-auto max-w-4xl">
			<a
				href="/portfolio#projects"
				class="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center transition-colors"
			>
				<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"
					></path>
				</svg>
				Back to Portfolio
			</a>

			<div class="mb-12 space-y-4">
				<h1 class="text-foreground text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					Personal Projects
				</h1>
				<p class="text-muted-foreground text-xl">
					Side Projects &bull; Experiments &bull; Creative Development
				</p>
			</div>
		</div>
	</section>

	<!-- Projects Grid -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-6xl">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Current Portfolio -->
				<div
					class="group border-border/20 hover:border-border/40 rounded-xl border p-6 transition-all duration-300"
				>
					<div class="space-y-4">
						<div class="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-lg">
							<svg
								class="text-foreground h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
								></path>
							</svg>
						</div>

						<div>
							<h3 class="text-foreground mb-2 text-xl font-semibold">Portfolio 2025</h3>
							<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
								Current portfolio built with SvelteKit, featuring modern UI components, interactive
								cursors, and performance optimizations. Showcases technical skills and creative
								development approach.
							</p>

							<div class="mb-4 flex flex-wrap gap-2">
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>SvelteKit</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Svelte 5</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>TypeScript</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Tailwind</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">WebGL</span
								>
							</div>

							<div class="flex items-center space-x-4 text-sm">
								<a
									href="https://github.com/RamaHerbin/portfolio-2k25"
									target="_blank"
									rel="noopener noreferrer"
									class="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
								>
									<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
										/>
									</svg>
									GitHub
								</a>
								<span class="text-muted-foreground">&bull;</span>
								<span class="text-muted-foreground">You're viewing it!</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Blog Platform -->
				<div
					class="group border-border/20 hover:border-border/40 rounded-xl border p-6 transition-all duration-300"
				>
					<div class="space-y-4">
						<div class="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-lg">
							<svg
								class="text-foreground h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
								></path>
							</svg>
						</div>

						<div>
							<h3 class="text-foreground mb-2 text-xl font-semibold">Blog Platform</h3>
							<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
								Personal blog exploring front-end development, creative coding, and technical
								insights. Built as a learning platform to share knowledge and document my
								development journey.
							</p>

							<div class="mb-4 flex flex-wrap gap-2">
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Next.js</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">MDX</span>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">Blog</span>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Writing</span
								>
							</div>

							<div class="flex items-center space-x-4 text-sm">
								<a
									href="https://blog.rama.app"
									target="_blank"
									rel="noopener noreferrer"
									class="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
								>
									<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										></path>
									</svg>
									Visit Blog
								</a>
							</div>
						</div>
					</div>
				</div>

				<!-- Previous Portfolio -->
				<div
					class="group border-border/20 hover:border-border/40 rounded-xl border p-6 transition-all duration-300"
				>
					<div class="space-y-4">
						<div class="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-lg">
							<svg
								class="text-foreground h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
						</div>

						<div>
							<h3 class="text-foreground mb-2 text-xl font-semibold">Portfolio Archive</h3>
							<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
								Previous portfolio iterations showcasing the evolution of my design and development
								approach. A testament to continuous learning and improvement in craft.
							</p>

							<div class="mb-4 flex flex-wrap gap-2">
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">React</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Archive</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Evolution</span
								>
							</div>

							<div class="text-muted-foreground text-sm">
								<span>Legacy versions</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Experiments -->
				<div
					class="group border-border/20 hover:border-border/40 rounded-xl border p-6 transition-all duration-300"
				>
					<div class="space-y-4">
						<div class="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-lg">
							<svg
								class="text-foreground h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
								></path>
							</svg>
						</div>

						<div>
							<h3 class="text-foreground mb-2 text-xl font-semibold">Creative Experiments</h3>
							<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
								Ongoing collection of creative coding experiments, UI component explorations, and
								technical proof-of-concepts. A playground for testing new ideas and technologies.
							</p>

							<div class="mb-4 flex flex-wrap gap-2">
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">WebGL</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Three.js</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs"
									>Experiments</span
								>
								<span class="bg-foreground/10 text-foreground rounded px-2 py-1 text-xs">R&D</span>
							</div>

							<div class="text-muted-foreground text-sm">
								<span>In development</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<Footer />
</div>
