"use client";

import { useSyncExternalStore } from "react";
import { DARK_HEX, LIGHT_HEX, STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark" | "system";

function readStoredTheme(): Theme {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		return saved === "light" || saved === "dark" ? saved : "system";
	} catch {
		return "system";
	}
}

function resolve(theme: Theme): boolean {
	return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

/** Point <meta name="theme-color"> at whatever is painting the page. */
export function syncThemeColor(dark: boolean): void {
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute("content", dark ? DARK_HEX : LIGHT_HEX);
}

function applyTheme(theme: Theme): void {
	const dark = resolve(theme);
	document.documentElement.classList.toggle("dark", dark);
	syncThemeColor(dark);
}

export function setTheme(theme: Theme): void {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Storage blocked: the toggle still works for this session.
	}
	applyTheme(theme);
}

/** Light ⇄ dark; from "system" it flips to the opposite of the resolved value. */
export function toggleTheme(): void {
	setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
}

function subscribe(onChange: () => void): () => void {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const onMedia = () => {
		if (readStoredTheme() === "system") applyTheme("system");
	};
	media.addEventListener("change", onMedia);

	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) applyTheme(readStoredTheme());
	};
	window.addEventListener("storage", onStorage);

	return () => {
		observer.disconnect();
		media.removeEventListener("change", onMedia);
		window.removeEventListener("storage", onStorage);
	};
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

/** Reactive view of the `.dark` class on <html>, which the inline script set before hydration. */
export function useTheme(): { isDark: boolean; toggleTheme: () => void } {
	const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return { isDark, toggleTheme };
}
