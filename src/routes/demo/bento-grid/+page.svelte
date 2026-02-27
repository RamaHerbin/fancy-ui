<script lang="ts">
	import { BentoGrid, BentoGridItem, BentoGridCard } from "$lib/fancy-ui/bento-grid";
</script>

<svelte:head>
	<title>Bento Grid - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Bento Grid</h1>
	<p class="text-muted-foreground mb-8">
		Bento-style grid layout for showcasing features and content in an organized grid.
	</p>

	<!-- BentoGridItem variant -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">BentoGridItem (Slot-based)</h2>
		<div class="bg-card rounded-lg border p-6">
			<BentoGrid>
				<BentoGridItem class="md:col-span-2">
					{#snippet header()}
						<div
							class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500"
						></div>
					{/snippet}
					{#snippet title()}Feature One{/snippet}
					{#snippet description()}A powerful feature that helps you build faster.{/snippet}
				</BentoGridItem>

				<BentoGridItem>
					{#snippet header()}
						<div
							class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500"
						></div>
					{/snippet}
					{#snippet title()}Feature Two{/snippet}
					{#snippet description()}Streamline your workflow.{/snippet}
				</BentoGridItem>

				<BentoGridItem>
					{#snippet header()}
						<div
							class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500"
						></div>
					{/snippet}
					{#snippet title()}Feature Three{/snippet}
					{#snippet description()}Beautiful by default.{/snippet}
				</BentoGridItem>

				<BentoGridItem class="md:col-span-2">
					{#snippet header()}
						<div
							class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500"
						></div>
					{/snippet}
					{#snippet title()}Feature Four{/snippet}
					{#snippet description()}Ship with confidence using robust tooling.{/snippet}
				</BentoGridItem>
			</BentoGrid>
		</div>
	</section>

	<!-- BentoGridCard variant -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">BentoGridCard (Props-based)</h2>
		<div class="bg-card rounded-lg border p-6">
			<BentoGrid>
				<BentoGridCard
					class="md:col-span-2"
					name="Analytics Dashboard"
					description="Real-time insights into your data with interactive charts."
					href="#"
					cta="Learn more"
				>
					{#snippet background()}
						<div
							class="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20"
						></div>
					{/snippet}
				</BentoGridCard>

				<BentoGridCard
					name="API Integration"
					description="Connect with any service in minutes."
					href="#"
					cta="View docs"
				>
					{#snippet background()}
						<div class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20"></div>
					{/snippet}
				</BentoGridCard>

				<BentoGridCard
					name="Authentication"
					description="Secure auth out of the box."
					href="#"
					cta="Get started"
				>
					{#snippet background()}
						<div
							class="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/20"
						></div>
					{/snippet}
				</BentoGridCard>

				<BentoGridCard
					class="md:col-span-2"
					name="Deployment"
					description="One-click deployment to any cloud provider."
					href="#"
					cta="Deploy now"
				>
					{#snippet background()}
						<div class="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20"></div>
					{/snippet}
				</BentoGridCard>
			</BentoGrid>
		</div>
	</section>
</div>
