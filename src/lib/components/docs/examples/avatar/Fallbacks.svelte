<script lang="ts">
	import { Avatar } from "$lib/fancy-ui/avatar";

	const names = [
		"Maya Okafor",
		"Lena Fischer",
		"Tomás Rivera",
		"Aiko Tanaka",
		"Noor Haddad",
		"Sam Patel",
	];
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center gap-3">
		{#each names as name (name)}
			<Avatar {name} />
		{/each}
	</div>

	<div class="flex flex-wrap items-center gap-6 text-sm">
		<div class="flex items-center gap-2">
			<!-- An image that cannot load falls back to the initials. -->
			<Avatar src="data:image/png;base64,AAAA" alt="Maya Okafor" name="Maya Okafor" />
			<span class="text-muted-foreground">broken image</span>
		</div>
		<div class="flex items-center gap-2">
			<!-- No name and no image: a neutral silhouette. -->
			<Avatar alt="Guest" />
			<span class="text-muted-foreground">no name</span>
		</div>
		<div class="flex items-center gap-2">
			<!-- Beside a visible name, alt="" keeps screen readers from saying it twice. -->
			<Avatar name="Lena Fischer" alt="" />
			<span>Lena Fischer</span>
		</div>
	</div>
</div>
