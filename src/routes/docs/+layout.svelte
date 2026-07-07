<script lang="ts">
	import Sidebar from "$lib/components/docs/Sidebar.svelte";
	import DocHeader from "$lib/components/docs/DocHeader.svelte";
	import TableOfContents from "$lib/components/docs/TableOfContents.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";

	let { children } = $props();

	let sidebarOpen = $state(false);
	let searchOpen = $state(false);
</script>

<Sidebar bind:open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

<div class="lg:ps-64">
	<DocHeader
		onMenuClick={() => (sidebarOpen = !sidebarOpen)}
		onSearchClick={() => (searchOpen = true)}
	/>

	<div class="mx-auto max-w-7xl px-4 py-8 lg:px-8">
		<div class="flex gap-10">
			<!-- Main content -->
			<main class="min-w-0 flex-1" data-doc-content>
				{@render children()}
			</main>

			<!-- TOC -->
			<div class="hidden w-48 shrink-0 xl:block">
				<TableOfContents />
			</div>
		</div>
	</div>
</div>

<CommandSearch bind:open={searchOpen} />
