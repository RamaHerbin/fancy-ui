import type { Skin } from "../../types.js";
import { retroOsTokens } from "./tokens.js";
import { retroOsMeta } from "./meta.js";
import { retroOsRecipes } from "./recipes.js";
import { buttonTrailing } from "./ornaments.js";
import "./retro-os.css";

export const retroOsSkin: Skin = {
	name: "retro-os",
	label: "Retro OS",
	colorScheme: "light",
	tokens: retroOsTokens,
	meta: retroOsMeta,
	fonts: [
		{
			id: "cam-font-retro-os",
			href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;900&family=IBM+Plex+Mono:wght@400;500;600;700&family=Silkscreen:wght@400;700&display=swap",
		},
	],
	recipes: retroOsRecipes,
	ornaments: { buttonTrailing },
};
