/**
 * Static map from icon name strings (used in builder registry)
 * to Lucide Svelte component constructors.
 * Avoids dynamic imports.
 */

import type { Component } from "svelte";
import {
  LayoutTemplate,
  Box,
  LayoutGrid,
  AlignHorizontalSpaceAround,
  Type,
  Image,
  SeparatorHorizontal,
  Sparkles,
  Sun,
  Zap,
  MousePointerClick,
  Rainbow,
  MoveHorizontal,
  Waves,
  Sparkle,
  Palette,
  Hash,
  RotateCw,
  Lightbulb,
  ArrowUp,
  Square,
  HelpCircle,
  Eye,
  PartyPopper,
  MousePointer,
  Paintbrush,
  LayoutDashboard,
  ScrollText,
} from "@lucide/svelte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, Component<any>> = {
  LayoutTemplate,
  Box,
  LayoutGrid,
  AlignHorizontalSpaceAround,
  Type,
  Image,
  SeparatorHorizontal,
  Sparkles,
  Sun,
  Zap,
  MousePointerClick,
  Rainbow,
  MoveHorizontal,
  Waves,
  Sparkle,
  Palette,
  Hash,
  RotateCw,
  Lightbulb,
  ArrowUp,
  Square,
  Eye,
  PartyPopper,
  MousePointer,
  Paintbrush,
  LayoutDashboard,
  ScrollText,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIcon(name: string): Component<any> {
  return iconMap[name] ?? HelpCircle;
}
