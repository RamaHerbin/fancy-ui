<script lang="ts">
	import { FireworksHdr, type FireworksHandle } from "$lib/fancy-ui/fireworks-hdr";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let handle = $state<FireworksHandle | null>(null);

	function launch() {
		handle?.launch({ apex: { x: 0.3 + Math.random() * 0.4, y: 0.24 + Math.random() * 0.2 } });
	}
</script>

<PropsPlayground
	component="FireworksHdr"
	slug="fireworks-hdr"
	constraints={["Mount it in a sized, relatively positioned container."]}
	controls={[
		{ key: "hdr", type: "boolean", label: "GPU engine (HDR)" },
		{ key: "exposure", type: "range", label: "Exposure", min: 1, max: 4, step: 0.1 },
		{ key: "ambient", type: "boolean", label: "Ambient shells" },
		{
			key: "ambientIntensity",
			type: "range",
			label: "Ambient intensity",
			min: 0,
			max: 1,
			step: 0.05,
		},
		{ key: "interactive", type: "boolean", label: "Interactive" },
		{
			key: "quality",
			type: "select",
			label: "Quality",
			options: ["auto", "high", "mid", "low"].map((v) => ({ value: v, label: v })),
		},
		{ key: "respectReducedMotion", type: "boolean", label: "Respect reduced motion" },
	]}
	initialValues={{
		hdr: true,
		exposure: 2.2,
		ambient: true,
		ambientIntensity: 0.35,
		interactive: true,
		quality: "auto",
		respectReducedMotion: true,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative h-72 w-[28rem] max-w-[85vw] overflow-hidden rounded-xl border border-black/[0.08] bg-black dark:border-white/[0.08]"
		>
			{#key JSON.stringify(values)}
				<FireworksHdr
					hdr={values.hdr as boolean}
					exposure={values.exposure as number}
					ambient={values.ambient as boolean}
					ambientIntensity={values.ambientIntensity as number}
					interactive={values.interactive as boolean}
					quality={values.quality as "auto" | "high" | "mid" | "low"}
					respectReducedMotion={values.respectReducedMotion as boolean}
					onReady={(h) => (handle = h)}
				/>
			{/key}
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-5">
				<button
					type="button"
					onclick={launch}
					class="pointer-events-auto rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
				>
					Launch a shell
				</button>
			</div>
		</div>
	{/snippet}
</PropsPlayground>
