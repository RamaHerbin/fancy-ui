<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";

	let count = $state(0);
</script>

<Button sound onclick={() => (count += 1)}>Clicked {count} {count === 1 ? "time" : "times"}</Button>
