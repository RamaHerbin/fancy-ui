<script lang="ts">
	// The documented subpath, in a plain Vite app: no SvelteKit module involved.
	import { brutalSkin, Button, FancyProvider } from "fancy-ui-svelte/cameleon";
</script>

<section data-testid="cameleon">
	<FancyProvider skin={brutalSkin}>
		<Button>Skinned button</Button>
	</FancyProvider>
</section>
