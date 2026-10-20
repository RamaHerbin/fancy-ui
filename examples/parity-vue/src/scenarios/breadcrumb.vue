<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/breadcrumb/BasicUsage.svelte.
import { Breadcrumb } from "fancy-ui-vue";
import type { BreadcrumbItem } from "fancy-ui-vue";

const items: BreadcrumbItem[] = [
	{ label: "Docs", href: "/docs" },
	{ label: "Core", href: "/docs/core" },
	{ label: "Button" },
];
</script>

<template>
	<Breadcrumb sound :items="items" />
</template>
