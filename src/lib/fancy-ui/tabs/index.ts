import Tabs from "./Tabs.svelte";
import TabsList from "./TabsList.svelte";
import TabsTrigger from "./TabsTrigger.svelte";
import TabsContent from "./TabsContent.svelte";
import type { TabsProps } from "./Tabs.svelte";
import type { TabsListProps } from "./TabsList.svelte";
import type { TabsTriggerProps } from "./TabsTrigger.svelte";
import type { TabsContentProps } from "./TabsContent.svelte";

export {
	Tabs,
	type TabsProps,
	TabsList,
	type TabsListProps,
	TabsTrigger,
	type TabsTriggerProps,
	TabsContent,
	type TabsContentProps,
};
export { TABS_KEY, type TabsContext } from "./types.js";
