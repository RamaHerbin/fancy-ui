<script lang="ts">
	import { MagneticField, MagneticItem } from "$lib/fancy-ui/magnetic-field";

	const tags = [
		"ferrite",
		"cobalt",
		"nickel",
		"iron filings",
		"flux",
		"north pole",
		"coil",
		"dipole",
		"lodestone",
		"alloy",
		"compass",
		"field lines",
		"spin",
		"domain",
		"ore",
		"south pole",
	];

	let awake = $state(false);
</script>

<!-- Pointer only (a mouse or pen; touch is ignored). The loop runs while the
     pointer is near and sleeps once every tag has settled. -->
<div class="mx-auto w-full max-w-xl">
	<MagneticField
		radius={160}
		maxTranslate={12}
		maxRotate={8}
		onActiveChange={(active) => (awake = active)}
		class="bg-card flex flex-wrap justify-center gap-3.5 rounded-2xl border p-10"
	>
		{#each tags as tag, i (tag)}
			<MagneticItem inline mass={i % 2 === 0 ? 0.8 : 1}>
				<span class="bg-muted text-foreground inline-block rounded-full border px-3 py-1 text-sm">
					{tag}
				</span>
			</MagneticItem>
		{/each}
	</MagneticField>
	<p class="text-muted-foreground mt-3 flex items-center justify-center gap-2 text-xs">
		<span
			class="size-1.5 rounded-full {awake ? 'bg-emerald-500' : 'bg-muted-foreground/40'}"
			aria-hidden="true"
		></span>
		{awake ? "Field awake" : "Field asleep: no frames scheduled"}
	</p>
</div>
