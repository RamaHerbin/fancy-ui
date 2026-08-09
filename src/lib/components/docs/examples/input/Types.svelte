<script lang="ts">
	import { Input } from "$lib/fancy-ui/input";
</script>

<div class="flex w-full max-w-sm flex-col gap-3">
	<Input type="text" placeholder="Text" label="Text" />
	<Input type="email" placeholder="name@example.com" label="Email" />
	<Input type="url" placeholder="https://example.com" label="URL" />
	<Input type="tel" placeholder="+1 555 0100" label="Phone" />
	<Input type="password" placeholder="Password" label="Password" />
	<Input type="search" placeholder="Search…" label="Search" />
	<Input type="number" placeholder="0" label="Number" />
</div>
