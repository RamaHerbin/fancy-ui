/**
 * Status chips for a component, as plain data: which message to show and in
 * which tone. Pure so the page, the card and the tests agree on one mapping.
 */
import type { MessageKey } from "$lib/i18n/messages/en.js";
import type { ComponentMeta } from "$lib/types.js";

export type BadgeTone = "success" | "warning" | "neutral" | "info" | "danger";

export interface ComponentBadge {
	id: "stable" | "in-progress" | "planned" | "deprecated" | "since";
	key: MessageKey;
	/** Values for `{placeholders}` in the message. */
	vars?: Record<string, string>;
	tone: BadgeTone;
}

/** Fill a message's `{placeholders}` from the badge's vars. */
export function fillBadge(text: string, vars?: Record<string, string>): string {
	if (!vars) return text;
	return Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, v), text);
}

export function componentBadges(meta: ComponentMeta): ComponentBadge[] {
	const badges: ComponentBadge[] = [];

	if (meta.deprecated) {
		badges.push({ id: "deprecated", key: "status.deprecated", tone: "danger" });
	} else if (meta.status === "done") {
		badges.push({ id: "stable", key: "status.stable", tone: "success" });
	} else if (meta.status === "in-progress") {
		badges.push({ id: "in-progress", key: "status.inProgress", tone: "warning" });
	} else if (meta.status === "planned") {
		badges.push({ id: "planned", key: "status.planned", tone: "neutral" });
	}

	const since = meta.since?.trim();
	if (since) {
		badges.push({ id: "since", key: "comp.sinceVersion", vars: { version: since }, tone: "info" });
	}

	return badges;
}
