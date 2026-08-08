<script lang="ts">
	import { Checkbox } from "$lib/fancy-ui/checkbox";

	let agreed = $state(false);
</script>

<Checkbox bind:checked={agreed}>I agree to the terms and conditions</Checkbox>
