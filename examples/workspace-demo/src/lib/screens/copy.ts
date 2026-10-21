// Interface copy for the four screens, kept apart from the shell's
// `strings.ts` so the screens and the shell can change independently. Same
// rule as there: no screen hard-codes a label.
export const copy = {
	profile: {
		identity: "Identity",
		details: "Details",
		detailsHint: "Shown on your profile card and next to your comments.",
		name: "Name",
		handle: "Handle",
		bio: "Bio",
		location: "Location",
		timezone: "Time zone",
		timezonePlaceholder: "Choose a time zone",
		save: "Save changes",
		saved: "Profile saved",
		saveFailed: "Couldn’t save your profile",
		saveFailedBody: "Your edits are still in the form. Try again.",
		// Announced by the save button's status mark. A failure is announced by
		// its toast, so the mark stays quiet then.
		status: { loading: "Saving your profile", success: "Profile saved", error: "" },
		emptyTitle: "Finish your profile",
		emptyBody:
			"Add a handle, a short bio and where you are so teammates know who they are talking to.",
		emptyAction: "Add details",
		memberSince: "Member since",
	},
	settings: {
		general: "General",
		generalHint: "How the workspace looks and reads.",
		notifications: "Notifications",
		privacy: "Privacy",
		security: "Security",
		workspaceName: "Workspace name",
		language: "Language",
		density: "Density",
		emailDigest: "Email digest",
		mentionsByEmail: "Mentions by email",
		productUpdates: "Product updates",
		publicProfile: "Public profile",
		shareUsageData: "Share anonymous usage data",
		twoFactor: "Two-step sign-in",
		sessionTimeout: "Sign out after",
		save: "Save settings",
		saved: "Settings saved",
		saveFailed: "Couldn’t save your settings",
		saveFailedBody: "Your edits are still on screen. Try again.",
		status: { loading: "Saving your settings", success: "Settings saved", error: "" },
		emptyTitle: "Set up your workspace",
		emptyBody: "Name it and pick your defaults. You can change everything later.",
		emptyAction: "Start with the basics",
	},
	apiKeys: {
		listLabel: "API keys",
		create: "Create key",
		createHeading: "New API key",
		createSubmit: "Create",
		cancel: "Cancel",
		keyName: "Key name",
		keyNamePlaceholder: "CI runner",
		scopes: "Scopes",
		secretTitle: "Copy your key now",
		secretBody: "This is the only time the full key is shown. Store it somewhere safe.",
		secretDone: "I’ve saved it",
		created: "Key created",
		neverUsed: "Never used",
		revoke: "Revoke",
		revoked: "Revoked",
		revokedBody: "The key stops working in a few seconds.",
		undo: "Undo",
		revokeFailed: "Couldn’t revoke",
		revokeFailedBody: "The key is back in the list. Try again.",
		createFailed: "Couldn’t create the key",
		emptyTitle: "No API keys yet",
		emptyBody: "Keys let scripts and integrations talk to your workspace.",
		emptyAction: "Create your first key",
	},
	notifications: {
		unread: "Unread",
		allCaughtUp: "All caught up",
		listLabel: "Notifications",
		markAllRead: "Mark all as read",
		clearRead: "Clear read",
		markRead: "Mark as read",
		markUnread: "Mark as unread",
		undo: "Undo",
		updateFailed: "Couldn’t update your notifications",
		updateFailedBody: "Nothing changed. Try again.",
		emptyTitle: "No notifications yet",
		emptyBody: "Mentions, replies and account notices will show up here.",
	},
} as const;

export function unreadLabel(count: number): string {
	return `${count} unread`;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** Title of the grouped undo after "Mark all as read". */
export function markedReadLabel(count: number): string {
	return `Marked ${count} ${plural(count, "notification", "notifications")} as read`;
}

/** Title of the grouped undo after "Clear read". */
export function clearedLabel(count: number): string {
	return `Cleared ${count} ${plural(count, "notification", "notifications")}`;
}
