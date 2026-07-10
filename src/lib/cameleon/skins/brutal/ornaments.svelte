<script module lang="ts">
	// Module-level snippet export (Svelte 5.5+). Skins attach these to a Skin's
	// `ornaments`; components render them at fixed slots. currentColor makes the
	// arrow track the button's per-variant text color.
	export { arrow as buttonTrailing };
</script>

{#snippet arrow()}
	<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" style="display:block;flex:none;">
		<path
			d="M3 11 L11 3 M4.5 3 L11 3 L11 9.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.9"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/snippet}
