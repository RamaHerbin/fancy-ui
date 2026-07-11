import type { Skin } from "../../types.js";
import { brutalTokens } from "./tokens.js";
import { brutalMeta } from "./meta.js";
import {
	brutalButton,
	brutalInput,
	brutalTextarea,
	brutalSelect,
	brutalCheckbox,
	brutalRadio,
	brutalSwitch,
	brutalSlider,
	brutalBadge,
	brutalTooltip,
} from "./recipes.js";
import { buttonTrailing } from "./ornaments.js";
import "./brutal.css";

export const brutalSkin: Skin = {
	name: "brutal",
	label: "Brutal",
	colorScheme: "light",
	tokens: brutalTokens,
	meta: brutalMeta,
	fonts: [
		{
			id: "cam-font-brutal",
			href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=Space+Mono:wght@400;700&display=swap",
		},
	],
	recipes: {
		button: brutalButton,
		input: brutalInput,
		textarea: brutalTextarea,
		select: brutalSelect,
		checkbox: brutalCheckbox,
		radio: brutalRadio,
		switch: brutalSwitch,
		slider: brutalSlider,
		badge: brutalBadge,
		tooltip: brutalTooltip,
	},
	ornaments: { buttonTrailing },
};
