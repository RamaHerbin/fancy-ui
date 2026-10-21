// The demo's pretend backend: an in-memory store behind async calls that wait
// a seeded, reproducible delay and fail on demand. It is the contract the
// screens are built against, so every state a real network produces
// (loading, empty, error then retry, success) can be shown on purpose:
//
//   /profile?latency=slow        long skeletons
//   /api-keys?fail=once          first load fails, Retry succeeds
//   /notifications?fail=always   the error state, every time
//   /settings?scenario=empty     the first launch after sign-up
//   ?seed=7                      another reproducible run
//
// Writes are atomic: a failed call leaves the store as it was. Everything a
// call returns is a copy, so a screen can mutate its own state freely and
// only `api` changes what the next read sees.
import {
	API_KEY_PREFIX,
	MOCK_NOW,
	clone,
	createMockData,
	type ApiKey,
	type CreatedApiKey,
	type NewApiKey,
	type Notification,
	type Profile,
	type ProfileUpdate,
	type Scenario,
	type Settings,
	type SettingsPatch,
	type WorkspaceData,
} from "./mock.js";

export type * from "./mock.js";

/**
 * When calls fail: `never`, `always`, `once` (the first call of each
 * operation fails, the next one succeeds: the retry path), or a rate between
 * 0 and 1 drawn from the seeded generator.
 */
export type FailurePolicy = "never" | "always" | "once" | number;

export interface Latency {
	/** Shortest wait, in milliseconds. */
	min: number;
	/** Longest wait, in milliseconds. */
	max: number;
}

export interface ApiConfig {
	/** Seeds the latency, failure and id generators. Same seed, same run. */
	seed: number;
	latency: Latency;
	failure: FailurePolicy;
	scenario: Scenario;
}

export const DEFAULT_CONFIG: Readonly<ApiConfig> = Object.freeze({
	seed: 2026,
	latency: Object.freeze({ min: 350, max: 1100 }),
	failure: "never",
	scenario: "ready",
});

export const LATENCY_PRESETS: Readonly<Record<"none" | "fast" | "slow", Latency>> = {
	none: { min: 0, max: 0 },
	fast: { min: 80, max: 240 },
	slow: { min: 1200, max: 2400 },
};

export type Operation =
	| "getProfile"
	| "updateProfile"
	| "getSettings"
	| "saveSettings"
	| "listApiKeys"
	| "createApiKey"
	| "revokeApiKey"
	| "listNotifications"
	| "setNotificationsRead"
	| "archiveNotifications";

/**
 * `unavailable`: the simulated outage, worth retrying.
 * `invalid`: the input was refused; `field` names the culprit.
 * `not_found`: the target no longer exists.
 */
export type ApiErrorCode = "unavailable" | "invalid" | "not_found";

export class ApiError extends Error {
	override readonly name = "ApiError";
	readonly operation: Operation | "unknown";
	readonly code: ApiErrorCode;
	readonly retryable: boolean;
	readonly field?: string;

	constructor(
		operation: Operation | "unknown",
		code: ApiErrorCode,
		message: string,
		field?: string
	) {
		super(message);
		this.operation = operation;
		this.code = code;
		this.retryable = code === "unavailable";
		if (field !== undefined) this.field = field;
	}
}

export interface WorkspaceApi {
	readonly config: Readonly<ApiConfig>;
	/** Changes the switches at runtime. A new scenario reloads its seed data. */
	configure(patch: Partial<ApiConfig>): void;
	/** Restores the current scenario's seed data and re-arms `once`. */
	reset(): void;

	getProfile(): Promise<Profile>;
	updateProfile(update: ProfileUpdate): Promise<Profile>;

	getSettings(): Promise<Settings>;
	saveSettings(patch: SettingsPatch): Promise<Settings>;

	/** Newest first. Never includes a secret. */
	listApiKeys(): Promise<ApiKey[]>;
	/** Resolves with the full secret: the only time it is ever returned. */
	createApiKey(input: NewApiKey): Promise<CreatedApiKey>;
	revokeApiKey(id: string): Promise<void>;

	/** Newest first. */
	listNotifications(): Promise<Notification[]>;
	/** Marks every listed notification read (or unread); resolves with them. */
	setNotificationsRead(ids: string[], read: boolean): Promise<Notification[]>;
	archiveNotifications(ids: string[]): Promise<void>;
}

export interface ApiDeps {
	/** How the API waits. Tests pass one that records the delay and resolves at once. */
	sleep?: (ms: number) => Promise<void>;
}

/** Small, fast, seedable PRNG (mulberry32); returns floats in [0, 1). */
export function seeded(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
	Date.parse(b.createdAt) - Date.parse(a.createdAt);

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createApi(config: Partial<ApiConfig> = {}, deps: ApiDeps = {}): WorkspaceApi {
	const sleep = deps.sleep ?? realSleep;
	let current: ApiConfig = { ...DEFAULT_CONFIG, ...clone(config) };
	let data: WorkspaceData = createMockData(current.scenario);
	let latencyRandom = seeded(current.seed);
	let failureRandom = seeded(current.seed ^ 0x9e3779b9);
	let idRandom = seeded(current.seed + 0x2545f491);
	let failedOnce = new Set<Operation>();
	let createdCount = 0;

	function reseed() {
		latencyRandom = seeded(current.seed);
		failureRandom = seeded(current.seed ^ 0x9e3779b9);
		idRandom = seeded(current.seed + 0x2545f491);
		createdCount = 0;
	}

	function shouldFail(operation: Operation): boolean {
		const policy = current.failure;
		if (policy === "never") return false;
		if (policy === "always") return true;
		if (policy === "once") {
			if (failedOnce.has(operation)) return false;
			failedOnce.add(operation);
			return true;
		}
		return failureRandom() < policy;
	}

	/** Waits the seeded delay, then either throws the simulated outage or runs `work`. */
	async function call<T>(operation: Operation, work: () => T): Promise<T> {
		const { min, max } = current.latency;
		const delay = Math.round(min + latencyRandom() * Math.max(0, max - min));
		if (delay > 0) await sleep(delay);
		if (shouldFail(operation)) {
			throw new ApiError(
				operation,
				"unavailable",
				`${operation} failed: the workspace service did not answer (simulated).`
			);
		}
		return clone(work());
	}

	function invalid(operation: Operation, field: string, message: string): never {
		throw new ApiError(operation, "invalid", message, field);
	}

	function randomString(length: number): string {
		let out = "";
		for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(idRandom() * ALPHABET.length)];
		return out;
	}

	return {
		get config() {
			return clone(current);
		},

		configure(patch) {
			const previous = current;
			current = { ...current, ...clone(patch) };
			if (patch.failure !== undefined) failedOnce = new Set();
			if (patch.seed !== undefined && patch.seed !== previous.seed) reseed();
			if (patch.scenario !== undefined && patch.scenario !== previous.scenario) {
				data = createMockData(current.scenario);
			}
		},

		reset() {
			data = createMockData(current.scenario);
			failedOnce = new Set();
			reseed();
		},

		getProfile: () => call("getProfile", () => data.profile),

		updateProfile(update) {
			const patch = clone(update);
			return call("updateProfile", () => {
				if (patch.name !== undefined && patch.name.trim() === "") {
					invalid("updateProfile", "name", "A name is required.");
				}
				data.profile = { ...data.profile, ...patch };
				return data.profile;
			});
		},

		getSettings: () => call("getSettings", () => data.settings),

		saveSettings(patch) {
			const changes = clone(patch);
			return call("saveSettings", () => {
				data.settings = { ...data.settings, ...changes };
				return data.settings;
			});
		},

		listApiKeys: () => call("listApiKeys", () => [...data.apiKeys].sort(byNewest)),

		createApiKey(input) {
			const request = clone(input);
			return call("createApiKey", () => {
				const name = request.name.trim();
				if (!name) invalid("createApiKey", "name", "Give the key a name.");
				if (request.scopes.length === 0) {
					invalid("createApiKey", "scopes", "Pick at least one scope.");
				}
				createdCount += 1;
				const secret = API_KEY_PREFIX + randomString(32);
				const key: ApiKey = {
					id: `key_new_${createdCount}_${randomString(6)}`,
					name,
					prefix: API_KEY_PREFIX,
					lastFour: secret.slice(-4),
					scopes: [...request.scopes],
					// Ahead of every seeded key, in creation order.
					createdAt: new Date(MOCK_NOW + createdCount * 1000).toISOString(),
					lastUsedAt: null,
					createdBy: data.profile.name,
				};
				data.apiKeys = [key, ...data.apiKeys];
				return { key, secret };
			});
		},

		revokeApiKey(id) {
			return call("revokeApiKey", () => {
				if (!data.apiKeys.some((key) => key.id === id)) {
					throw new ApiError("revokeApiKey", "not_found", "This key no longer exists.");
				}
				data.apiKeys = data.apiKeys.filter((key) => key.id !== id);
			});
		},

		listNotifications: () =>
			call("listNotifications", () => [...data.notifications].sort(byNewest)),

		setNotificationsRead(ids, read) {
			const wanted = new Set(clone(ids));
			return call("setNotificationsRead", () => {
				data.notifications = data.notifications.map((n) => (wanted.has(n.id) ? { ...n, read } : n));
				return data.notifications.filter((n) => wanted.has(n.id)).sort(byNewest);
			});
		},

		archiveNotifications(ids) {
			const wanted = new Set(clone(ids));
			return call("archiveNotifications", () => {
				const known = new Set(data.notifications.map((n) => n.id));
				if ([...wanted].some((id) => !known.has(id))) {
					throw new ApiError(
						"archiveNotifications",
						"not_found",
						"Some of these notifications no longer exist."
					);
				}
				data.notifications = data.notifications.filter((n) => !wanted.has(n.id));
			});
		},
	};
}

/**
 * Reads the simulation switches from a query string; values it does not
 * understand are ignored rather than guessed at.
 */
export function parseApiConfig(search: string | URLSearchParams): Partial<ApiConfig> {
	const params = typeof search === "string" ? new URLSearchParams(search) : search;
	const out: Partial<ApiConfig> = {};

	const fail = params.get("fail");
	if (fail === "never" || fail === "always" || fail === "once") out.failure = fail;
	else if (fail !== null && fail.trim() !== "") {
		const rate = Number(fail);
		if (Number.isFinite(rate) && rate >= 0 && rate <= 1) out.failure = rate;
	}

	const scenario = params.get("scenario");
	if (scenario === "ready" || scenario === "empty") out.scenario = scenario;

	const seed = params.get("seed");
	if (seed !== null && /^\d+$/.test(seed)) out.seed = Number(seed);

	const latency = params.get("latency");
	if (latency === "none" || latency === "fast" || latency === "slow") {
		out.latency = { ...LATENCY_PRESETS[latency] };
	} else if (latency !== null && /^\d+$/.test(latency)) {
		out.latency = { min: Number(latency), max: Number(latency) };
	}

	return out;
}

/** What a screen renders for one request. */
export type LoadState<T> =
	| { status: "loading" }
	| { status: "empty"; data: T }
	| { status: "error"; error: ApiError }
	| { status: "ready"; data: T };

/**
 * Runs `request` and folds its outcome into a LoadState. `isEmpty` decides
 * when a successful answer is the empty state (a first launch, a cleared
 * list). Anything thrown that is not an ApiError is wrapped as a retryable one.
 */
export async function settle<T>(
	request: () => Promise<T>,
	isEmpty: (data: T) => boolean = () => false
): Promise<Exclude<LoadState<T>, { status: "loading" }>> {
	try {
		const data = await request();
		return isEmpty(data) ? { status: "empty", data } : { status: "ready", data };
	} catch (error) {
		if (error instanceof ApiError) return { status: "error", error };
		const message = error instanceof Error ? error.message : String(error);
		return { status: "error", error: new ApiError("unknown", "unavailable", message) };
	}
}

/**
 * The app's one instance. The root layout applies the query-string switches
 * to it before any screen is created, so a shared link reproduces the same
 * run from the first call.
 */
export const api: WorkspaceApi = createApi();
