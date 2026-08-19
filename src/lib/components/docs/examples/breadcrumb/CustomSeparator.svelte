<script lang="ts">
	import { Breadcrumb } from "$lib/fancy-ui/breadcrumb";
	import type { BreadcrumbItem } from "$lib/fancy-ui/breadcrumb";

	const items: BreadcrumbItem[] = [
		{ label: "Home", href: "/" },
		{ label: "Settings", href: "/settings" },
		{ label: "Profile" },
	];
</script>

<Breadcrumb {items} separator=">" />
