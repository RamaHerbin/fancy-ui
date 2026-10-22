// Seed data for the workspace demo. Everything is fictional and dated at or
// before MOCK_NOW, a fixed instant, so the prerendered pages and the tests see
// the same timeline on every run. The content is data, not interface copy, so
// it stays in English whatever the chrome is translated to.

/** The instant the demo pretends it is: 21 October 2026, 09:00 UTC. */
export const MOCK_NOW = Date.parse("2026-10-21T09:00:00.000Z");

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** An ISO timestamp `ms` before MOCK_NOW. */
export function ago(ms: number): string {
	return new Date(MOCK_NOW - ms).toISOString();
}

/** `ready` is a workspace in use; `empty` is the first launch after sign-up. */
export type Scenario = "ready" | "empty";

export interface Person {
	name: string;
}

export interface Profile {
	id: string;
	name: string;
	email: string;
	/** Public handle, without the leading `@`. */
	handle: string;
	role: string;
	bio: string;
	location: string;
	/** IANA zone, e.g. "Europe/Paris". */
	timezone: string;
	/** No picture ships with the demo: the avatar shows initials taken from `name`. */
	avatarUrl: string | null;
	joinedAt: string;
}

/** The fields the profile form may change. */
export type ProfileUpdate = Partial<
	Pick<Profile, "name" | "handle" | "bio" | "location" | "timezone">
>;

export type Density = "comfortable" | "compact";
export type EmailDigest = "off" | "daily" | "weekly";

/**
 * Workspace preferences, grouped the way the Settings screen lays them out:
 * general, notifications, privacy, security. The colour theme is not here:
 * it is a per-device choice the shell keeps in the browser.
 */
export interface Settings {
	// General
	workspaceName: string;
	/** BCP 47 tag of the interface language. */
	language: string;
	density: Density;
	// Notifications
	emailDigest: EmailDigest;
	mentionsByEmail: boolean;
	productUpdates: boolean;
	// Privacy
	publicProfile: boolean;
	shareUsageData: boolean;
	// Security
	twoFactor: boolean;
	sessionTimeoutMinutes: number;
}

export type SettingsPatch = Partial<Settings>;

export type ApiKeyScope = "read" | "write" | "admin";

export const API_KEY_SCOPES: readonly ApiKeyScope[] = ["read", "write", "admin"];

export interface ApiKey {
	id: string;
	name: string;
	/** Visible start of the secret, e.g. "fws_live_". */
	prefix: string;
	/** Last four characters of the secret, to tell keys apart. */
	lastFour: string;
	scopes: ApiKeyScope[];
	createdAt: string;
	/** `null` until the key is used once. */
	lastUsedAt: string | null;
	createdBy: string;
}

export interface NewApiKey {
	name: string;
	scopes: ApiKeyScope[];
}

/** What `createApiKey` resolves with: the only time the full secret exists. */
export interface CreatedApiKey {
	key: ApiKey;
	secret: string;
}

export type NotificationKind =
	| "mention"
	| "comment"
	| "invite"
	| "security"
	| "billing"
	| "release";

export interface Notification {
	id: string;
	kind: NotificationKind;
	title: string;
	body: string;
	createdAt: string;
	read: boolean;
	/** Who triggered it; `null` for a system notice. */
	actor: Person | null;
}

export interface WorkspaceData {
	profile: Profile;
	settings: Settings;
	apiKeys: ApiKey[];
	notifications: Notification[];
}

export const API_KEY_PREFIX = "fws_live_";

const DEFAULT_SETTINGS: Settings = {
	workspaceName: "Orbit Atelier",
	language: "en",
	density: "comfortable",
	emailDigest: "weekly",
	mentionsByEmail: true,
	productUpdates: false,
	publicProfile: true,
	shareUsageData: false,
	twoFactor: false,
	sessionTimeoutMinutes: 60,
};

const READY_PROFILE: Profile = {
	id: "usr_01",
	name: "Maya Okafor",
	email: "maya@orbit-atelier.test",
	handle: "maya",
	role: "Design lead",
	bio: "Designs the quiet parts of the product: settings, empty states and everything in between.",
	location: "Lisbon",
	timezone: "Europe/Lisbon",
	avatarUrl: null,
	joinedAt: ago(412 * DAY),
};

const EMPTY_PROFILE: Profile = {
	...READY_PROFILE,
	id: "usr_new",
	handle: "",
	role: "Owner",
	bio: "",
	location: "",
	joinedAt: ago(4 * MINUTE),
};

const API_KEYS: ApiKey[] = [
	{
		id: "key_01",
		name: "Production deploys",
		prefix: API_KEY_PREFIX,
		lastFour: "8f2c",
		scopes: ["read", "write"],
		createdAt: ago(180 * DAY),
		lastUsedAt: ago(2 * HOUR),
		createdBy: "Maya Okafor",
	},
	{
		id: "key_02",
		name: "Analytics export",
		prefix: API_KEY_PREFIX,
		lastFour: "a41d",
		scopes: ["read"],
		createdAt: ago(64 * DAY),
		lastUsedAt: ago(3 * DAY),
		createdBy: "Theo Lindqvist",
	},
	{
		id: "key_03",
		name: "Staging admin",
		prefix: API_KEY_PREFIX,
		lastFour: "07be",
		scopes: ["read", "write", "admin"],
		createdAt: ago(9 * DAY),
		lastUsedAt: null,
		createdBy: "Maya Okafor",
	},
];

const THEO: Person = { name: "Theo Lindqvist" };
const AMARA: Person = { name: "Amara Diallo" };
const KENJI: Person = { name: "Kenji Mori" };

const NOTIFICATIONS: Notification[] = [
	{
		id: "ntf_01",
		kind: "mention",
		title: "Theo mentioned you in Onboarding copy",
		body: "“@maya can you sanity-check the empty state before Friday?”",
		createdAt: ago(12 * MINUTE),
		read: false,
		actor: THEO,
	},
	{
		id: "ntf_02",
		kind: "comment",
		title: "Amara replied to your comment",
		body: "Agreed — the retry button should keep its width while it spins.",
		createdAt: ago(48 * MINUTE),
		read: false,
		actor: AMARA,
	},
	{
		id: "ntf_03",
		kind: "security",
		title: "New sign-in from an unrecognised device",
		body: "Lisbon, Portugal. If this wasn’t you, revoke the session in Settings.",
		createdAt: ago(5 * HOUR),
		read: false,
		actor: null,
	},
	{
		id: "ntf_04",
		kind: "invite",
		title: "Kenji joined Orbit Atelier",
		body: "Kenji accepted your invitation and can now edit projects.",
		createdAt: ago(1 * DAY + 3 * HOUR),
		read: true,
		actor: KENJI,
	},
	{
		id: "ntf_05",
		kind: "release",
		title: "Version 2.4 is live",
		body: "Bulk actions, a faster search and a calmer notification centre.",
		createdAt: ago(3 * DAY),
		read: true,
		actor: null,
	},
	{
		id: "ntf_06",
		kind: "billing",
		title: "Your invoice for September is ready",
		body: "€48.00 was charged to the card ending in 0417.",
		createdAt: ago(20 * DAY),
		read: true,
		actor: null,
	},
];

/** JSON-safe deep copy. Unlike structuredClone it accepts reactive proxies. */
export function clone<T>(value: T): T {
	if (value === undefined) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

/** A fresh, independent copy of the seed data for `scenario`. */
export function createMockData(scenario: Scenario = "ready"): WorkspaceData {
	if (scenario === "empty") {
		return clone({
			profile: EMPTY_PROFILE,
			settings: { ...DEFAULT_SETTINGS, workspaceName: "" },
			apiKeys: [],
			notifications: [],
		});
	}
	return clone({
		profile: READY_PROFILE,
		settings: DEFAULT_SETTINGS,
		apiKeys: API_KEYS,
		notifications: NOTIFICATIONS,
	});
}
