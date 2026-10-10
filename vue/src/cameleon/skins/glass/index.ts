import type { Skin } from "../../types.js";
import { glassTokens } from "./tokens.js";
import { glassMeta } from "./meta.js";
import { glassRecipes } from "./recipes.js";
import "./glass.css";

export const glassSkin: Skin = {
	name: "glass",
	label: "Glass",
	colorScheme: "dark",
	tokens: glassTokens,
	meta: glassMeta,
	recipes: glassRecipes,
};
