<script lang="ts">
	import { BentoGrid, BentoGridCard } from "$lib/fancy-ui/bento-grid";
</script>

<BentoGrid>
	<BentoGridCard
		class="md:col-span-2"
		name="Analytics Dashboard"
		description="Real-time insights into your data with interactive charts."
		href="#"
		cta="Learn more"
	>
		{#snippet background()}
			<div class="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20"></div>
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
			<div class="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/20"></div>
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
