/**
 * Reading order of the component pages: the order the sidebar lists them in —
 * core groups first, then fancy, each group by category, registry order inside
 * a category. Deprecated entries are not listed.
 */
import { coreCategories, fancyCategories, getListedComponents } from "$lib/fancy-ui/registry.js";
import type { ComponentCategory, ComponentMeta } from "$lib/types.js";

function inGroup(
	all: ComponentMeta[],
	group: ComponentMeta["group"],
	categories: ComponentCategory[]
): ComponentMeta[] {
	return categories.flatMap((category) =>
		all.filter((c) => c.group === group && c.category === category)
	);
}

export function componentsInSidebarOrder(): ComponentMeta[] {
	const all = getListedComponents();
	return [...inGroup(all, "core", coreCategories), ...inGroup(all, "fancy", fancyCategories)];
}

export interface Neighbours {
	previous?: ComponentMeta;
	next?: ComponentMeta;
}

/** The entries before and after `slug`; the ends do not wrap. */
export function neighboursInSidebarOrder(slug: string): Neighbours {
	const list = componentsInSidebarOrder();
	const index = list.findIndex((c) => c.slug === slug);
	if (index === -1) return {};
	return { previous: list[index - 1], next: list[index + 1] };
}
