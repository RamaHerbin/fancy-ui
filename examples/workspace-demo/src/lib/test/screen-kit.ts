// Shared by the screen tests: an API with a recorded clock, a way to leave a
// request pending forever (the loading state) and a way to wait for a state.
import { screen, waitFor } from "@testing-library/svelte";
import { expect } from "vitest";
import "./dom-shims.js";
import { createApi, type ApiConfig, type WorkspaceApi } from "$lib/data/api.js";

export type ScreenState = "loading" | "empty" | "error" | "ready";

const instant = () => Promise.resolve();
const never = () => new Promise<void>(() => {});

export function makeApi(
	config: Partial<ApiConfig> = {},
	opts: { pending?: boolean } = {}
): WorkspaceApi {
	return createApi(
		{ latency: { min: 5, max: 5 }, ...config },
		{ sleep: opts.pending ? never : instant }
	);
}

export function screenRoot(name: string): HTMLElement {
	const root = document.querySelector<HTMLElement>(`[data-screen="${name}"]`);
	if (!root) throw new Error(`no [data-screen="${name}"] rendered`);
	return root;
}

/** A toast is both shown and announced, so its text appears twice; wait for either. */
export async function expectToast(text: string) {
	await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0));
}

export async function waitForState(name: string, state: ScreenState) {
	await waitFor(() => expect(screenRoot(name).dataset.state).toBe(state));
}

/**
 * An API whose calls wait while the test holds them: `hold()` makes every
 * later call wait, `release()` lets the waiting ones settle and stops
 * holding. Shows what a screen does while a write is in flight.
 */
export function makeGatedApi(config: Partial<ApiConfig> = {}) {
	let holding = false;
	const waiting: (() => void)[] = [];
	const api = createApi(
		{ latency: { min: 5, max: 5 }, ...config },
		{
			sleep: () =>
				holding ? new Promise<void>((resolve) => waiting.push(resolve)) : Promise.resolve(),
		}
	);
	return {
		api,
		hold() {
			holding = true;
		},
		release() {
			holding = false;
			for (const resolve of waiting.splice(0)) resolve();
		},
	};
}

/** What the status mark inside a button shows: idle, loading, success or error. */
export function morphState(button: HTMLElement): string | undefined {
	return button.querySelector<HTMLElement>(".ft-statusmorph")?.dataset.state;
}

/** The toast panel a toast button belongs to. */
export function toastOf(button: HTMLElement): HTMLElement {
	const panel = button.closest<HTMLElement>(".ft-toast");
	if (!panel) throw new Error("not inside a toast");
	return panel;
}
