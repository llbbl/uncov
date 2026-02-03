/**
 * Detection utilities
 * Detects package manager, existing configuration, etc.
 */

import { fileExists } from "../utils/fs";

/**
 * Supported package managers
 */
export type PackageManager = "pnpm" | "bun" | "npm" | "yarn";

/**
 * Detect the package manager used in the project
 * Priority: pnpm > bun > npm > yarn
 */
export async function detectPackageManager(_cwd?: string): Promise<PackageManager> {
	// TODO: Implement detection
	// - Check for pnpm-lock.yaml
	// - Check for bun.lockb
	// - Check for package-lock.json
	// - Check for yarn.lock
	// - Default to npm
	return "npm";
}

// Re-export fileExists for consumers of this module
export { fileExists };
