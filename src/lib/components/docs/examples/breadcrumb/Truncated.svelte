<script lang="ts">
	import { Breadcrumb } from "$lib/fancy-ui/breadcrumb";
	import type { BreadcrumbItem } from "$lib/fancy-ui/breadcrumb";

	const items: BreadcrumbItem[] = [
		{ label: "Docs", href: "/docs" },
		{ label: "Core", href: "/docs/core" },
		{ label: "Navigation", href: "/docs/core/navigation" },
		{ label: "Components", href: "/docs/core/navigation/components" },
		{ label: "Button" },
	];
</script>

<Breadcrumb {items} maxItems={3} />
