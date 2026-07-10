import type { Preview } from "@storybook/sveltekit";
import "../src/routes/layout.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: "todo",
		},
		backgrounds: { disable: true },
	},
	globalTypes: {
		theme: {
			description: "Color scheme",
			toolbar: {
				title: "Theme",
				icon: "mirror",
				items: [
					{ value: "light", title: "Light" },
					{ value: "dark", title: "Dark" },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: "light",
	},
	decorators: [
		(story, context) => {
			const theme = context.globals.theme ?? "light";
			document.documentElement.classList.toggle("dark", theme === "dark");
			document.body.classList.add("bg-background", "text-foreground");
			return story();
		},
	],
};

export default preview;
