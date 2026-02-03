/**
 * Shared constants for the uncov CLI
 */

/**
 * Vitest/Vite config file names to check (in priority order)
 * Vitest config files are checked first, then Vite config files
 */
export const VITEST_CONFIG_FILES = [
	{ file: "vitest.config.ts", type: "ts" },
	{ file: "vitest.config.js", type: "js" },
	{ file: "vitest.config.mts", type: "mts" },
	{ file: "vitest.config.mjs", type: "mjs" },
	{ file: "vite.config.ts", type: "ts" },
	{ file: "vite.config.js", type: "js" },
	{ file: "vite.config.mts", type: "mts" },
	{ file: "vite.config.mjs", type: "mjs" },
] as const;

/**
 * Type representing valid vitest config file extensions
 */
export type VitestConfigType = (typeof VITEST_CONFIG_FILES)[number]["type"];
