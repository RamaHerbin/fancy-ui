<script lang="ts">
	import { VoiceInput } from "$lib/fancy-ui/voice-input";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="VoiceInput"
	slug="voice-input"
	constraints={["It never opens a microphone: pass `samples` from your own audio pipeline."]}
	controls={[
		{ key: "demo", type: "boolean", label: "Demo waveform" },
		{ key: "height", type: "range", label: "Height (px)", min: 16, max: 240, step: 2 },
		{ key: "color", type: "color", label: "Bar color" },
		{ key: "transcript", type: "text", label: "Transcript", maxLength: 80 },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		demo: true,
		height: 48,
		color: "#8ec5ff",
		transcript: "show me the retry policy for failed webhook deliveries",
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div
			class="relative w-[28rem] max-w-[85vw] overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<VoiceInput
				demo={values.demo as boolean}
				height={values.height as number}
				color={values.color as string}
				transcript={values.transcript as string}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
