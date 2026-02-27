<script lang="ts">
	import Footer from "$lib/portfolio/sections/Footer.svelte";
</script>

<svelte:head>
	<title>Fleur de Papier Projects - Rama Herbin</title>
	<meta
		name="description"
		content="Creative web applications developed at Fleur de Papier cultural mediation agency. Interactive digital experiences for museums and cultural institutions."
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
					Fleur de Papier
				</h1>
				<p class="text-muted-foreground text-xl">
					Cultural Mediation &bull; Interactive Experiences &bull; Creative Development
				</p>
			</div>

			<div class="prose prose-lg dark:prose-invert max-w-none">
				<p class="text-muted-foreground text-lg leading-relaxed">
					At Fleur de Papier, a cultural mediation agency, I developed creative web applications
					that bridge art, technology, and public engagement. Working closely with art directors and
					cultural institutions, I crafted interactive digital experiences that make culture
					accessible and engaging.
				</p>
			</div>
		</div>
	</section>

	<!-- Featured Projects -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-6xl">
			<h2 class="text-foreground mb-8 text-2xl font-bold">Featured Projects</h2>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Project Card 1 -->
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
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								></path>
							</svg>
						</div>
						<h3 class="text-foreground mb-2 text-lg font-semibold">Interactive Cultural Exhibit</h3>
						<p class="text-muted-foreground text-sm">
							Digital interactive experience for museum visitors, combining touch interfaces with
							historical content.
						</p>
					</div>
				</div>

				<!-- Project Card 2 -->
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
						<h3 class="text-foreground mb-2 text-lg font-semibold">Museum Digital Experience</h3>
						<p class="text-muted-foreground text-sm">Case study in preparation</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Skills & Technologies -->
	<section class="bg-muted/20 px-6 py-16">
		<div class="mx-auto max-w-4xl">
			<h2 class="text-foreground mb-8 text-center text-2xl font-bold">Technologies & Approach</h2>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<div>
					<h3 class="text-foreground mb-4 text-lg font-semibold">Technical Stack</h3>
					<ul class="text-muted-foreground space-y-2">
						<li>&#8226; VueJS for interactive interfaces</li>
						<li>&#8226; JavaScript ES6+ for modern functionality</li>
						<li>&#8226; CSS3 animations and transitions</li>
						<li>&#8226; Responsive design principles</li>
						<li>&#8226; Accessibility-first development</li>
					</ul>
				</div>

				<div>
					<h3 class="text-foreground mb-4 text-lg font-semibold">Creative Focus</h3>
					<ul class="text-muted-foreground space-y-2">
						<li>&#8226; User-centered cultural experiences</li>
						<li>&#8226; Interactive storytelling</li>
						<li>&#8226; Cross-generational accessibility</li>
						<li>&#8226; Performance optimization</li>
						<li>&#8226; Creative problem-solving</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<Footer />
</div>
