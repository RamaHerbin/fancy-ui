<script lang="ts">
	import { PixelScene, type PixelSceneName } from "$lib/fancy-ui/pixel-scene";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="PixelScene"
	slug="pixel-scene"
	constraints={[
		"Give the host a height: the picture fills whatever box it gets.",
		"`night` is one-way: the component never changes it. Flip it from your own click, button or theme.",
		"Keep copy in the top-left corner, which every scene leaves open.",
	]}
	controls={[
		{
			key: "scene",
			type: "select",
			label: "Scene",
			options: [
				{ value: "alpine", label: "Alpine" },
				{ value: "meadow", label: "Meadow" },
				{ value: "sea", label: "Sea" },
				{ value: "mountains", label: "Mountains" },
			],
		},
		{ key: "night", type: "boolean", label: "Night" },
		{ key: "cell", type: "range", label: "Cell (px)", min: 4, max: 12, step: 1 },
		{ key: "dot", type: "range", label: "Dot (px)", min: 1, max: 12, step: 1 },
		{ key: "lens", type: "boolean", label: "Lens" },
		{ key: "lensRadius", type: "range", label: "Lens radius (cells)", min: 6, max: 40, step: 1 },
		{
			key: "ink",
			type: "select",
			label: "Ink",
			options: [
				{ value: "currentColor", label: "Text colour" },
				{ value: "#6b7383", label: "Slate" },
				{ value: "#b5402a", label: "Rust" },
				{ value: "#2f5a3a", label: "Pine" },
			],
		},
		{ key: "hdr", type: "boolean", label: "HDR" },
		{ key: "paused", type: "boolean", label: "Paused" },
	]}
	initialValues={{
		scene: "alpine",
		night: false,
		cell: 5,
		dot: 4,
		lens: true,
		lensRadius: 21,
		ink: "currentColor",
		hdr: true,
		paused: false,
	}}
>
	{#snippet preview(values)}
		<PixelScene
			class="border-foreground/10 text-foreground h-72 w-full rounded-xl border"
			scene={values.scene as PixelSceneName}
			night={values.night as boolean}
			cell={values.cell as number}
			dot={values.dot as number}
			lens={values.lens as boolean}
			lensRadius={values.lensRadius as number}
			ink={values.ink as string}
			hdr={values.hdr as boolean}
			paused={values.paused as boolean}
		/>
	{/snippet}
</PropsPlayground>
