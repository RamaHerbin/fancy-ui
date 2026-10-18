<script lang="ts">
	import { BentoGrid, BentoGridCard } from "$lib/fancy-ui/bento-grid";
	import ChartArea from "@lucide/svelte/icons/chart-area";
	import Plug from "@lucide/svelte/icons/plug";
	import KeyRound from "@lucide/svelte/icons/key-round";
	import CloudUpload from "@lucide/svelte/icons/cloud-upload";
</script>

{#snippet wash(color: string, at: string)}
	<!-- A soft colour pool, plus a faint dot lattice that fades toward the text. -->
	<div
		class="absolute inset-0 opacity-70 dark:opacity-100"
		style="background: radial-gradient(70% 90% at {at}, color-mix(in oklab, {color} 22%, transparent), transparent 70%);"
	></div>
	<div
		class="absolute inset-0 text-black/[0.07] dark:text-white/[0.06]"
		style="background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: 16px 16px; mask-image: linear-gradient(180deg, black, transparent 65%); -webkit-mask-image: linear-gradient(180deg, black, transparent 65%);"
	></div>
{/snippet}

<BentoGrid accent="#a78bfa">
	<BentoGridCard
		class="md:col-span-2"
		name="Analytics Dashboard"
		description="Real-time insights into your data with interactive charts."
		href="#"
		cta="Learn more"
	>
		{#snippet icon()}<ChartArea />{/snippet}
		{#snippet background()}{@render wash("#a78bfa", "85% 0%")}{/snippet}
	</BentoGridCard>

	<BentoGridCard
		class="md:col-span-1"
		name="API Integration"
		description="Connect with any service in minutes."
		href="#"
		cta="View docs"
	>
		{#snippet icon()}<Plug />{/snippet}
		{#snippet background()}{@render wash("#67e8f9", "100% 0%")}{/snippet}
	</BentoGridCard>

	<BentoGridCard
		class="md:col-span-1"
		name="Authentication"
		description="Secure auth out of the box."
		href="#"
		cta="Get started"
	>
		{#snippet icon()}<KeyRound />{/snippet}
		{#snippet background()}{@render wash("#fbbf24", "0% 0%")}{/snippet}
	</BentoGridCard>

	<BentoGridCard
		class="md:col-span-2"
		name="Deployment"
		description="One-click deployment to any cloud provider."
		href="#"
		cta="Deploy now"
	>
		{#snippet icon()}<CloudUpload />{/snippet}
		{#snippet background()}{@render wash("#f472b6", "90% 10%")}{/snippet}
	</BentoGridCard>
</BentoGrid>
