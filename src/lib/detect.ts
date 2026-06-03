/**
 * Detection utilities
 * Detects package manager, existing configuration, etc.
 */

import { fileExists, readText, resolvePath } from "../utils/fs";
import { VITEST_CONFIG_FILES, type VitestConfigType } from "./constants";

/**
 * Supported package managers
 */
export type PackageManager = "pnpm" | "bun" | "npm" | "yarn";

/**
 * Vitest config detection result
 */
export interface VitestConfigResult {
	path: string;
	type: VitestConfigType;
}

/**
 * Gitignore detection result
 */
export interface GitignoreResult {
	exists: boolean;
	hasCoverage: boolean;
}

/**
 * Lockfile to package manager mapping (in priority order)
 */
const LOCKFILE_MAP: Array<{ file: string; manager: PackageManager }> = [
	{ file: "pnpm-lock.yaml", manager: "pnpm" },
	{ file: "bun.lock", manager: "bun" },
	{ file: "bun.lockb", manager: "bun" },
	{ file: "package-lock.json", manager: "npm" },
	{ file: "yarn.lock", manager: "yarn" },
];

/**
 * Detect the package manager used in the project
 * Priority: pnpm > bun > npm > yarn
 * @param cwd - Directory to check (defaults to process.cwd())
 * @returns Detected package manager, defaults to 'npm' if none found
 */
export function detectPackageManager(cwd?: string): PackageManager {
	for (const { file, manager } of LOCKFILE_MAP) {
		const lockfilePath = resolvePath(file, cwd);
		if (fileExists(lockfilePath)) {
			return manager;
		}
	}
	return "npm";
}

/**
 * Detect vitest configuration file
 * Checks for vitest.config.* first, then vite.config.*
 * @param cwd - Directory to check (defaults to process.cwd())
 * @returns Config file info, or null if not found
 */
export function detectVitestConfig(cwd?: string): VitestConfigResult | null {
	for (const { file, type } of VITEST_CONFIG_FILES) {
		const configPath = resolvePath(file, cwd);
		if (fileExists(configPath)) {
			return { path: configPath, type };
		}
	}
	return null;
}

/**
 * Detect .gitignore and check if it includes coverage directory
 * @param cwd - Directory to check (defaults to process.cwd())
 * @returns Detection result with exists and hasCoverage flags
 */
export function detectGitignore(cwd?: string): GitignoreResult {
	const gitignorePath = resolvePath(".gitignore", cwd);

	if (!fileExists(gitignorePath)) {
		return { exists: false, hasCoverage: false };
	}

	try {
		const content = readText(gitignorePath);
		const lines = content.split("\n").map((line) => line.trim());

		// Check if any line actually ignores the `coverage/` directory.
		// Only accept exact entries (after stripping leading `!` for negation):
		//   coverage, coverage/, /coverage, /coverage/, **/coverage, **/coverage/
		// Per gitignore semantics, `**/` matches zero or more path components,
		// so `**/coverage` and `**/coverage/` also match the root `coverage/` dir.
		// Reject coverage*, coverage-final.json, coverage-reports/, etc.
		const hasCoverage = lines.some((line) => {
			// Skip comments and empty lines
			if (line === "" || line.startsWith("#")) {
				return false;
			}
			// Strip leading `!` (negation marker) so we examine the underlying pattern
			const pattern = line.startsWith("!") ? line.slice(1) : line;
			return (
				pattern === "coverage" ||
				pattern === "coverage/" ||
				pattern === "/coverage" ||
				pattern === "/coverage/" ||
				pattern === "**/coverage" ||
				pattern === "**/coverage/"
			);
		});

		return { exists: true, hasCoverage };
	} catch {
		return { exists: true, hasCoverage: false };
	}
}

// Re-export fileExists for consumers of this module
export { fileExists };
