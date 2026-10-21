// Interface copy for the demo's chrome, kept in one place so the screens never
// hard-code a label and a later translation pass has a single file to read.
// Mock content (names, notification text) is data and lives in data/mock.ts.

export type ScreenId = "profile" | "settings" | "apiKeys" | "notifications";

export interface ScreenCopy {
	/** Navigation label and the screen's h1. */
	title: string;
	/** One line under the h1. */
	description: string;
}

export const strings = {
	app: {
		name: "Orbit Atelier",
		/** Appended to every document title: "Profile · Workspace demo". */
		titleSuffix: "Workspace demo",
	},
	nav: {
		/** Accessible name of the navigation landmark (desktop rail and mobile sheet). */
		label: "Workspace",
		accountGroup: "Account",
		developerGroup: "Developers",
		open: "Open navigation",
		sheetTitle: "Navigation",
		skipToContent: "Skip to content",
	},
	theme: {
		toDark: "Switch to dark theme",
		toLight: "Switch to light theme",
	},
	screens: {
		profile: {
			title: "Profile",
			description: "How teammates see you across the workspace.",
		},
		settings: {
			title: "Settings",
			description: "Workspace preferences, notifications, privacy and security.",
		},
		apiKeys: {
			title: "API keys",
			description: "Keys for scripts and integrations. Revoke the ones you no longer use.",
		},
		notifications: {
			title: "Notifications",
			description: "Mentions, replies and account notices, newest first.",
		},
	} satisfies Record<ScreenId, ScreenCopy>,
	states: {
		loading: "Loading…",
		errorTitle: "This didn’t load",
		errorBody: "The workspace service did not answer. Your changes are safe.",
		retry: "Try again",
	},
	units: {
		unread: "unread",
	},
} as const;

export function documentTitle(screen: ScreenId): string {
	return `${strings.screens[screen].title} · ${strings.app.titleSuffix}`;
}
