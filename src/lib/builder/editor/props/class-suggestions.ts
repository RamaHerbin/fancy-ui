/**
 * Curated Tailwind class suggestions for the ClassEditor.
 * Organized by category, using theme-aware tokens where possible.
 */

export interface ClassSuggestion {
	value: string;
	label: string;
	category: string;
}

export const CLASS_CATEGORIES = [
	"Typography",
	"Colors",
	"Spacing",
	"Sizing",
	"Borders",
	"Effects",
	"Layout",
	"Flexbox & Grid",
] as const;

export type ClassCategory = (typeof CLASS_CATEGORIES)[number];

export const CLASS_SUGGESTIONS: ClassSuggestion[] = [
	// Typography
	{ value: "text-xs", label: "Extra Small", category: "Typography" },
	{ value: "text-sm", label: "Small", category: "Typography" },
	{ value: "text-base", label: "Base", category: "Typography" },
	{ value: "text-lg", label: "Large", category: "Typography" },
	{ value: "text-xl", label: "Extra Large", category: "Typography" },
	{ value: "text-2xl", label: "2XL", category: "Typography" },
	{ value: "text-3xl", label: "3XL", category: "Typography" },
	{ value: "text-4xl", label: "4XL", category: "Typography" },
	{ value: "font-light", label: "Light Weight", category: "Typography" },
	{ value: "font-normal", label: "Normal Weight", category: "Typography" },
	{ value: "font-medium", label: "Medium Weight", category: "Typography" },
	{ value: "font-semibold", label: "Semibold", category: "Typography" },
	{ value: "font-bold", label: "Bold", category: "Typography" },
	{ value: "text-center", label: "Center Align", category: "Typography" },
	{ value: "text-left", label: "Left Align", category: "Typography" },
	{ value: "text-right", label: "Right Align", category: "Typography" },
	{ value: "uppercase", label: "Uppercase", category: "Typography" },
	{ value: "lowercase", label: "Lowercase", category: "Typography" },
	{ value: "capitalize", label: "Capitalize", category: "Typography" },
	{ value: "italic", label: "Italic", category: "Typography" },
	{ value: "underline", label: "Underline", category: "Typography" },
	{ value: "line-through", label: "Strikethrough", category: "Typography" },
	{ value: "leading-tight", label: "Tight Leading", category: "Typography" },
	{ value: "leading-relaxed", label: "Relaxed Leading", category: "Typography" },
	{ value: "tracking-wide", label: "Wide Tracking", category: "Typography" },
	{ value: "truncate", label: "Truncate", category: "Typography" },

	// Colors (theme-aware)
	{ value: "text-foreground", label: "Foreground", category: "Colors" },
	{ value: "text-muted-foreground", label: "Muted Text", category: "Colors" },
	{ value: "text-primary", label: "Primary Text", category: "Colors" },
	{ value: "text-destructive", label: "Destructive Text", category: "Colors" },
	{ value: "bg-background", label: "Background", category: "Colors" },
	{ value: "bg-muted", label: "Muted BG", category: "Colors" },
	{ value: "bg-primary", label: "Primary BG", category: "Colors" },
	{ value: "bg-primary/10", label: "Primary 10%", category: "Colors" },
	{ value: "bg-secondary", label: "Secondary BG", category: "Colors" },
	{ value: "bg-accent", label: "Accent BG", category: "Colors" },
	{ value: "bg-destructive", label: "Destructive BG", category: "Colors" },
	{ value: "bg-card", label: "Card BG", category: "Colors" },
	{ value: "bg-transparent", label: "Transparent BG", category: "Colors" },
	{ value: "bg-white", label: "White BG", category: "Colors" },
	{ value: "bg-black", label: "Black BG", category: "Colors" },

	// Spacing
	{ value: "p-2", label: "Padding 2", category: "Spacing" },
	{ value: "p-4", label: "Padding 4", category: "Spacing" },
	{ value: "p-6", label: "Padding 6", category: "Spacing" },
	{ value: "p-8", label: "Padding 8", category: "Spacing" },
	{ value: "px-4", label: "Padding X 4", category: "Spacing" },
	{ value: "py-4", label: "Padding Y 4", category: "Spacing" },
	{ value: "m-auto", label: "Margin Auto", category: "Spacing" },
	{ value: "mt-4", label: "Margin Top 4", category: "Spacing" },
	{ value: "mb-4", label: "Margin Bottom 4", category: "Spacing" },
	{ value: "mx-auto", label: "Margin X Auto", category: "Spacing" },
	{ value: "space-y-2", label: "Space Y 2", category: "Spacing" },
	{ value: "space-y-4", label: "Space Y 4", category: "Spacing" },
	{ value: "space-x-2", label: "Space X 2", category: "Spacing" },
	{ value: "space-x-4", label: "Space X 4", category: "Spacing" },

	// Sizing
	{ value: "w-full", label: "Full Width", category: "Sizing" },
	{ value: "w-auto", label: "Auto Width", category: "Sizing" },
	{ value: "w-1/2", label: "Half Width", category: "Sizing" },
	{ value: "w-1/3", label: "Third Width", category: "Sizing" },
	{ value: "max-w-sm", label: "Max Width SM", category: "Sizing" },
	{ value: "max-w-md", label: "Max Width MD", category: "Sizing" },
	{ value: "max-w-lg", label: "Max Width LG", category: "Sizing" },
	{ value: "max-w-xl", label: "Max Width XL", category: "Sizing" },
	{ value: "h-full", label: "Full Height", category: "Sizing" },
	{ value: "h-screen", label: "Screen Height", category: "Sizing" },
	{ value: "h-auto", label: "Auto Height", category: "Sizing" },
	{ value: "min-h-screen", label: "Min Screen Height", category: "Sizing" },
	{ value: "aspect-video", label: "Aspect Video", category: "Sizing" },
	{ value: "aspect-square", label: "Aspect Square", category: "Sizing" },

	// Borders
	{ value: "rounded", label: "Rounded", category: "Borders" },
	{ value: "rounded-md", label: "Rounded MD", category: "Borders" },
	{ value: "rounded-lg", label: "Rounded LG", category: "Borders" },
	{ value: "rounded-xl", label: "Rounded XL", category: "Borders" },
	{ value: "rounded-2xl", label: "Rounded 2XL", category: "Borders" },
	{ value: "rounded-full", label: "Rounded Full", category: "Borders" },
	{ value: "border", label: "Border", category: "Borders" },
	{ value: "border-2", label: "Border 2px", category: "Borders" },
	{ value: "border-border", label: "Border Color", category: "Borders" },
	{ value: "border-primary", label: "Primary Border", category: "Borders" },
	{ value: "border-t", label: "Border Top", category: "Borders" },
	{ value: "border-b", label: "Border Bottom", category: "Borders" },

	// Effects
	{ value: "shadow-sm", label: "Shadow SM", category: "Effects" },
	{ value: "shadow", label: "Shadow", category: "Effects" },
	{ value: "shadow-md", label: "Shadow MD", category: "Effects" },
	{ value: "shadow-lg", label: "Shadow LG", category: "Effects" },
	{ value: "shadow-xl", label: "Shadow XL", category: "Effects" },
	{ value: "shadow-none", label: "No Shadow", category: "Effects" },
	{ value: "opacity-50", label: "50% Opacity", category: "Effects" },
	{ value: "opacity-75", label: "75% Opacity", category: "Effects" },
	{ value: "backdrop-blur-sm", label: "Backdrop Blur SM", category: "Effects" },
	{ value: "backdrop-blur-md", label: "Backdrop Blur MD", category: "Effects" },
	{ value: "transition-all", label: "Transition All", category: "Effects" },
	{ value: "duration-200", label: "Duration 200ms", category: "Effects" },
	{ value: "duration-300", label: "Duration 300ms", category: "Effects" },

	// Layout
	{ value: "relative", label: "Relative", category: "Layout" },
	{ value: "absolute", label: "Absolute", category: "Layout" },
	{ value: "fixed", label: "Fixed", category: "Layout" },
	{ value: "sticky", label: "Sticky", category: "Layout" },
	{ value: "hidden", label: "Hidden", category: "Layout" },
	{ value: "block", label: "Block", category: "Layout" },
	{ value: "inline-block", label: "Inline Block", category: "Layout" },
	{ value: "overflow-hidden", label: "Overflow Hidden", category: "Layout" },
	{ value: "overflow-auto", label: "Overflow Auto", category: "Layout" },
	{ value: "z-10", label: "Z-Index 10", category: "Layout" },
	{ value: "z-20", label: "Z-Index 20", category: "Layout" },
	{ value: "z-50", label: "Z-Index 50", category: "Layout" },
	{ value: "inset-0", label: "Inset 0", category: "Layout" },

	// Flexbox & Grid
	{ value: "flex", label: "Flex", category: "Flexbox & Grid" },
	{ value: "inline-flex", label: "Inline Flex", category: "Flexbox & Grid" },
	{ value: "flex-col", label: "Flex Column", category: "Flexbox & Grid" },
	{ value: "flex-row", label: "Flex Row", category: "Flexbox & Grid" },
	{ value: "flex-wrap", label: "Flex Wrap", category: "Flexbox & Grid" },
	{ value: "items-center", label: "Items Center", category: "Flexbox & Grid" },
	{ value: "items-start", label: "Items Start", category: "Flexbox & Grid" },
	{ value: "items-end", label: "Items End", category: "Flexbox & Grid" },
	{ value: "justify-center", label: "Justify Center", category: "Flexbox & Grid" },
	{ value: "justify-between", label: "Justify Between", category: "Flexbox & Grid" },
	{ value: "justify-start", label: "Justify Start", category: "Flexbox & Grid" },
	{ value: "gap-2", label: "Gap 2", category: "Flexbox & Grid" },
	{ value: "gap-4", label: "Gap 4", category: "Flexbox & Grid" },
	{ value: "gap-6", label: "Gap 6", category: "Flexbox & Grid" },
	{ value: "gap-8", label: "Gap 8", category: "Flexbox & Grid" },
	{ value: "grid", label: "Grid", category: "Flexbox & Grid" },
	{ value: "grid-cols-2", label: "Grid 2 Cols", category: "Flexbox & Grid" },
	{ value: "grid-cols-3", label: "Grid 3 Cols", category: "Flexbox & Grid" },
	{ value: "grid-cols-4", label: "Grid 4 Cols", category: "Flexbox & Grid" },
	{ value: "flex-1", label: "Flex Grow", category: "Flexbox & Grid" },
	{ value: "flex-shrink-0", label: "No Shrink", category: "Flexbox & Grid" },
];
