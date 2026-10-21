<script lang="ts">
	import PropsPlayground from "./PropsPlayground.svelte";
</script>

<PropsPlayground
	component="Button"
	slug="button"
	constraints={["Mount it in a sized container."]}
	controls={[{ key: "size", type: "range", label: "Size", min: 1, max: 9 }]}
	initialValues={{ size: 2 }}
>
	{#snippet preview(values)}
		<span data-testid="size">{values.size}</span>
	{/snippet}
</PropsPlayground>
