<script lang="ts">
	// The documented subpath, outside SvelteKit. Built only with CONSUMER_CAMELEON=1
	// (see vite.config.js and scripts/consumers/svelte-vite.sh).
	import { brutalSkin, Button, FancyProvider } from "fancy-ui-svelte/cameleon";
</script>

<section data-testid="cameleon">
	<FancyProvider skin={brutalSkin}>
		<Button>Skinned button</Button>
	</FancyProvider>
</section>
