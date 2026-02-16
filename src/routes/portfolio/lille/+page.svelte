<script lang="ts">
	import { FallingStarsBg } from '$lib/fancy-ui/bg-falling-stars/index.js';
	import { Timeline } from '$lib/fancy-ui/timeline/index.js';

	const timelineItems = [
		{ id: 'morning', label: '9:00' },
		{ id: 'afternoon', label: '14:00' },
		{ id: 'evening', label: '19:00' },
		{ id: 'night', label: '23:00' }
	];
</script>

<svelte:head>
	<title>Why Lille is Secretly the Best City</title>
	<meta
		name="description"
		content="Discover why Lille, France is secretly the best city in Europe. From amazing food culture to perfect location, student energy, and authentic French charm."
	/>
</svelte:head>

<div class="min-h-screen relative overflow-hidden">
	<FallingStarsBg count={150} color="#8B5CF6" class="opacity-20" />

	<main class="relative z-10">
		<!-- Hero -->
		<section class="min-h-[80vh] flex items-center justify-center px-6 py-20">
			<div class="max-w-4xl mx-auto text-center space-y-8">
				<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
					Why Lille is secretly the best city
				</h1>

				<div
					class="space-y-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto"
				>
					<p>
						Nestled in northern France, Lille is that friend who doesn't need to shout to be heard.
						While Paris gets all the attention, Lille quietly perfects the art of living well &mdash;
						with cobblestone streets that whisper stories, estaminets that serve the best
						carbonnade, and people so warm they'll make you forget about the northern weather.
					</p>

					<p>
						It's a city where students from across Europe come to study and never really want to
						leave, where you can hop on a train and be in London, Brussels, or Amsterdam faster
						than you can say "ch'ti". Lille doesn't try too hard &mdash; it just is. And that's
						exactly why it wins.
					</p>
				</div>
			</div>
		</section>

		<!-- Timeline -->
		<section class="py-20">
			<Timeline
				title="A Perfect Day in Lille"
				description="From morning coffee to late-night revelry, here's how Lille does it right"
				items={timelineItems}
			>
				{#snippet content(item)}
					<div class="relative ml-20 mb-10 max-w-4xl">
						<div
							class="rounded-lg border border-border/20 bg-background/50 backdrop-blur-sm p-8"
						>
							{#if item.id === 'morning'}
								<h4 class="text-2xl font-semibold text-foreground mb-4">Morning Bliss</h4>
								<p class="text-muted-foreground text-lg leading-relaxed">
									Start your day at a cozy caf&eacute; in Vieux-Lille with a proper French
									breakfast. The architecture here makes every morning feel like a movie scene
									&mdash; Flemish baroque meets French elegance, with just enough morning mist
									to add mystery.
								</p>
							{:else if item.id === 'afternoon'}
								<h4 class="text-2xl font-semibold text-foreground mb-4">
									Afternoon Adventures
								</h4>
								<p class="text-muted-foreground text-lg leading-relaxed">
									Wander through the Grand Place, pop into independent boutiques, or catch an
									exhibition at LaM (modern art that doesn't take itself too seriously). Grab
									some maroilles cheese and fresh bread &mdash; because when in Lille, you
									embrace the strong flavors.
								</p>
							{:else if item.id === 'evening'}
								<h4 class="text-2xl font-semibold text-foreground mb-4">Evening Magic</h4>
								<p class="text-muted-foreground text-lg leading-relaxed">
									Dinner at an authentic estaminet where the portions are generous and the
									bi&egrave;re flows freely. Try the welsh (yes, it's a thing here) or stick to
									classics like pot'je vleesch. The conversations flow as smoothly as the local
									Trois Monts beer.
								</p>
							{:else if item.id === 'night'}
								<h4 class="text-2xl font-semibold text-foreground mb-4">Night Vibes</h4>
								<p class="text-muted-foreground text-lg leading-relaxed">
									The student quarter comes alive with bars that stay open late and
									conversations that go deeper. Whether you're dancing at a club near
									R&eacute;publique or having philosophical debates over craft cocktails,
									Lille's nightlife has that perfect balance of energy and intimacy.
								</p>
							{/if}
						</div>
					</div>
				{/snippet}
			</Timeline>
		</section>

		<!-- Reasons -->
		<section class="py-20 px-6">
			<div class="max-w-4xl mx-auto">
				<h2
					class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-16 text-center"
				>
					Why Lille Actually Wins
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div
							class="p-6 rounded-lg border border-border/20 bg-background/30 backdrop-blur-sm"
						>
							<h3 class="text-xl font-semibold text-foreground mb-3">
								🍺 Food & Drink Culture
							</h3>
							<p class="text-muted-foreground">
								Where else can you find carbonnade flamande that tastes like a warm hug? The
								estaminets here don't just serve food &mdash; they serve experiences, with recipes
								passed down through generations and beer that pairs perfectly with everything.
							</p>
						</div>

						<div
							class="p-6 rounded-lg border border-border/20 bg-background/30 backdrop-blur-sm"
						>
							<h3 class="text-xl font-semibold text-foreground mb-3">
								🚄 Location, Location, Location
							</h3>
							<p class="text-muted-foreground">
								One hour to Paris, one hour to Brussels, two hours to London. Lille is basically
								Europe's best-kept secret hub. You get all the benefits of a major city without
								the chaos, plus weekend trips to anywhere become effortless.
							</p>
						</div>
					</div>

					<div class="space-y-6">
						<div
							class="p-6 rounded-lg border border-border/20 bg-background/30 backdrop-blur-sm"
						>
							<h3 class="text-xl font-semibold text-foreground mb-3">🎓 Student Energy</h3>
							<p class="text-muted-foreground">
								With over 100,000 students, Lille pulses with youthful energy year-round. The
								city adapts to this rhythm &mdash; affordable, vibrant, and always up for a good
								time. It's like the city never really grows up, in the best possible way.
							</p>
						</div>

						<div
							class="p-6 rounded-lg border border-border/20 bg-background/30 backdrop-blur-sm"
						>
							<h3 class="text-xl font-semibold text-foreground mb-3">
								🏛️ Architecture That Tells Stories
							</h3>
							<p class="text-muted-foreground">
								Flemish influence meets French sophistication in streets that feel like open-air
								museums. Every corner has character, from the Grand Place's baroque facades to
								the modern Euralille district's bold statements.
							</p>
						</div>
					</div>
				</div>

				<div class="mt-8">
					<div class="p-6 rounded-lg border border-border/20 bg-background/30 backdrop-blur-sm">
						<h3 class="text-xl font-semibold text-foreground mb-3">
							🎉 La Braderie (September Magic)
						</h3>
						<p class="text-muted-foreground">
							Europe's largest flea market transforms the entire city into one giant celebration.
							Two million visitors, mountains of mussel shells, and treasures hidden in every
							stall. It's chaos in the most beautiful way &mdash; pure Lille spirit on full
							display.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Closing -->
		<section class="py-20 px-6">
			<div class="max-w-3xl mx-auto text-center space-y-8">
				<h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
					Ready for Real City Vibes?
				</h2>

				<p class="text-lg sm:text-xl text-muted-foreground leading-relaxed">
					If you're tired of cities that try too hard to impress, come to Lille. It won't
					overwhelm you with tourist traps or exhaust you with pretension. Instead, it'll welcome
					you with open arms, feed you incredibly well, and show you what it means to live with
					both style and substance.
				</p>

				<p class="text-lg sm:text-xl text-muted-foreground leading-relaxed">
					Lille doesn't need to convince you it's the best city.
					<span class="font-semibold text-foreground"
						>It just lets you discover it for yourself.</span
					>
				</p>

				<div class="pt-8">
					<p class="text-sm text-muted-foreground/80 italic">
						Bienvenue &agrave; Lille &mdash; where every day feels like a small celebration 🎉
					</p>
				</div>
			</div>
		</section>
	</main>
</div>
