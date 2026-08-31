import type { Skin } from "../../types.js";
import { auroraTokens } from "./tokens.js";
import { auroraMeta } from "./meta.js";
import { auroraRecipes } from "./recipes.js";
import "./aurora.css";

export const auroraSkin: Skin = {
	name: "aurora",
	label: "Aurora",
	colorScheme: "dark",
	tokens: auroraTokens,
	meta: auroraMeta,
	recipes: auroraRecipes,
};
