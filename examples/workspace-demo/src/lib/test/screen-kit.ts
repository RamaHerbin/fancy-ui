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
