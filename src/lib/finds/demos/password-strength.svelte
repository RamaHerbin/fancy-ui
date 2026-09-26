<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { PasswordInput } from "$lib/fancy-ui/password-input";

	let { values }: { values: PlaygroundValues } = $props();

	let value = $state("");
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="w-64">
		<PasswordInput
			bind:value
			label="Password"
			placeholder="Enter your password"
			showStrength={values.showStrength as boolean}
			showToggle={values.showToggle as boolean}
		/>
	</div>
</div>
