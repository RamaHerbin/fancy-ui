<script lang="ts">
	import { Breadcrumb } from "$lib/fancy-ui/breadcrumb";
	import type { BreadcrumbItem } from "$lib/fancy-ui/breadcrumb";

	const items: BreadcrumbItem[] = [
		{ label: "Docs", href: "/docs" },
		{ label: "Core", href: "/docs/core" },
		{ label: "Button" },
	];
</script>

<Breadcrumb sound {items} />
