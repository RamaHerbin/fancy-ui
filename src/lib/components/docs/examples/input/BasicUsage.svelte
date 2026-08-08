<script lang="ts">
	import { Input } from "$lib/fancy-ui/input";

	let email = $state("");
</script>

<Input bind:value={email} type="email" placeholder="name@example.com" label="Email" />
