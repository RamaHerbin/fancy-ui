<script lang="ts">
	import { PasswordInput } from "$lib/fancy-ui/password-input";

	let password = $state("");
</script>

<PasswordInput sound bind:value={password} label="Password" placeholder="Enter your password" />
