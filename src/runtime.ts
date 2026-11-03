declare const __OBSIDIAN_PLUGIN__: boolean;
export const IS_OBSIDIAN_PLUGIN = typeof __OBSIDIAN_PLUGIN__ !== "undefined" && __OBSIDIAN_PLUGIN__;
export const DEFAULT_PATTERN_COLOR = IS_OBSIDIAN_PLUGIN ? "#000000" : "#a47b4c";
