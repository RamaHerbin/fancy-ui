// Mirrors src/lib/components/docs/examples/breadcrumb/BasicUsage.svelte.
import { Breadcrumb } from "fancy-ui-react";
import type { BreadcrumbItem } from "fancy-ui-react";

const items: BreadcrumbItem[] = [
	{ label: "Docs", href: "/docs" },
	{ label: "Core", href: "/docs/core" },
	{ label: "Button" },
];

export default function Scenario() {
	return <Breadcrumb sound items={items} />;
}
