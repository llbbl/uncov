/**
 * Vitest configuration utilities
 * Detects and modifies vitest.config.ts
 */

import { fileExists, readText, resolvePath } from "../utils/fs";
import { VITEST_CONFIG_FILES } from "./constants";

/**
 * Check if vitest or vite config exists
 * @param cwd - Directory to check (defaults to process.cwd())
 * @returns true if any vitest/vite config file exists
 */
export function hasVitestConfig(cwd?: string): boolean {
	for (const { file } of VITEST_CONFIG_FILES) {
		const configPath = resolvePath(file, cwd);
		if (fileExists(configPath)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if coverage is configured in a vitest/vite config file.
 *
 * This function uses heuristic text matching to detect coverage configuration.
 * It is not a full parser and may have false positives/negatives in edge cases.
 *
 * Detection strategy:
 * 1. Primary check: Look for explicit `coverage: {` blocks (most reliable)
 * 2. Secondary check: Look for `coverage: someVariable` property assignments
 *
 * Known limitations:
 * - May match coverage in comments
 * - May miss dynamically generated coverage config
 * - May match unrelated uses of the word "coverage"
 *
 * @param configPath - Path to the config file
 * @returns true if coverage settings are detected
 */
export function hasCoverageConfig(configPath: string): boolean {
	if (!fileExists(configPath)) {
		return false;
	}

	try {
		const content = readText(configPath);

		// Primary check: explicit coverage configuration block
		// Matches: coverage: { or coverage : {
		const hasCoverageBlock = /coverage\s*:\s*\{/.test(content);
		if (hasCoverageBlock) {
			return true;
		}

		// Secondary check: coverage property assignment
		// Matches: coverage: someVariable or coverage: true
		const hasCoverageProperty = /coverage\s*:\s*[a-zA-Z]/.test(content);
		return hasCoverageProperty;
	} catch {
		return false;
	}
}

/**
 * Generate a complete vitest.config.ts file with coverage configuration
 * @returns Complete vitest.config.ts content
 */
export function createVitestConfig(): string {
	return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});
`;
}
