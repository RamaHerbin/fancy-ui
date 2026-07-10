import type { Skin } from "../../types.js";
import { terminalTokens } from "./tokens.js";
import { terminalRecipes } from "./recipes.js";
import { terminalMeta } from "./meta.js";
import { buttonTrailing } from "./ornaments.svelte";
import "./terminal.css";

export const terminalSkin: Skin = {
	name: "terminal",
	label: "Terminal",
	colorScheme: "dark",
	tokens: terminalTokens,
	fonts: [
		{
			id: "cam-font-terminal",
			href: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
		},
	],
	recipes: terminalRecipes,
	ornaments: { buttonTrailing },
	meta: terminalMeta,
};
