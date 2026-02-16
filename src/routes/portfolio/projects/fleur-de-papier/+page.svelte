<script lang="ts">
	import Footer from '$lib/portfolio/sections/Footer.svelte';
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
	<section class="pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<a
				href="/portfolio#projects"
				class="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					></path>
				</svg>
				Back to Portfolio
			</a>

			<div class="space-y-4 mb-12">
				<h1
					class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
				>
					Fleur de Papier
				</h1>
				<p class="text-xl text-muted-foreground">
					Cultural Mediation &bull; Interactive Experiences &bull; Creative Development
				</p>
			</div>

			<div class="prose prose-lg dark:prose-invert max-w-none">
				<p class="text-lg text-muted-foreground leading-relaxed">
					At Fleur de Papier, a cultural mediation agency, I developed creative web applications
					that bridge art, technology, and public engagement. Working closely with art directors
					and cultural institutions, I crafted interactive digital experiences that make culture
					accessible and engaging.
				</p>
			</div>
		</div>
	</section>

	<!-- Featured Projects -->
	<section class="py-16 px-6">
		<div class="max-w-6xl mx-auto">
			<h2 class="text-2xl font-bold text-foreground mb-8">Featured Projects</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Project Card 1 -->
				<div
					class="group border border-border/20 rounded-xl p-6 hover:border-border/40 transition-all duration-300"
				>
					<div class="space-y-4">
						<div
							class="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center"
						>
							<svg
								class="w-6 h-6 text-foreground"
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
						<h3 class="text-lg font-semibold text-foreground mb-2">
							Interactive Cultural Exhibit
						</h3>
						<p class="text-muted-foreground text-sm">
							Digital interactive experience for museum visitors, combining touch interfaces with
							historical content.
						</p>
					</div>
				</div>

				<!-- Project Card 2 -->
				<div
					class="group border border-border/20 rounded-xl p-6 hover:border-border/40 transition-all duration-300"
				>
					<div class="space-y-4">
						<div
							class="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center"
						>
							<svg
								class="w-6 h-6 text-foreground"
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
						<h3 class="text-lg font-semibold text-foreground mb-2">
							Museum Digital Experience
						</h3>
						<p class="text-muted-foreground text-sm">Case study in preparation</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Skills & Technologies -->
	<section class="py-16 px-6 bg-muted/20">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-2xl font-bold text-foreground mb-8 text-center">
				Technologies & Approach
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div>
					<h3 class="text-lg font-semibold text-foreground mb-4">Technical Stack</h3>
					<ul class="space-y-2 text-muted-foreground">
						<li>&#8226; VueJS for interactive interfaces</li>
						<li>&#8226; JavaScript ES6+ for modern functionality</li>
						<li>&#8226; CSS3 animations and transitions</li>
						<li>&#8226; Responsive design principles</li>
						<li>&#8226; Accessibility-first development</li>
					</ul>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-foreground mb-4">Creative Focus</h3>
					<ul class="space-y-2 text-muted-foreground">
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
