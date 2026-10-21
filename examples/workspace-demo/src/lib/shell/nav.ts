import type { Component } from "svelte";
import Bell from "@lucide/svelte/icons/bell";
import KeyRound from "@lucide/svelte/icons/key-round";
import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
import User from "@lucide/svelte/icons/user";
import { strings, type ScreenId } from "$lib/strings.js";

export interface NavEntry {
	id: ScreenId;
	href: string;
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: Component<any>;
}

/** The screen map, in navigation order, grouped as the rail shows it. */
export const NAV_GROUPS: { label: string; entries: NavEntry[] }[] = [
	{
		label: strings.nav.accountGroup,
		entries: [
			{ id: "profile", href: "/profile", label: strings.screens.profile.title, icon: User },
			{
				id: "settings",
				href: "/settings",
				label: strings.screens.settings.title,
				icon: SlidersHorizontal,
			},
			{
				id: "notifications",
				href: "/notifications",
				label: strings.screens.notifications.title,
				icon: Bell,
			},
		],
	},
	{
		label: strings.nav.developerGroup,
		entries: [
			{ id: "apiKeys", href: "/api-keys", label: strings.screens.apiKeys.title, icon: KeyRound },
		],
	},
];

/** True when `pathname` is the entry's screen or below it. */
export function isCurrent(entry: NavEntry, pathname: string): boolean {
	return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}
