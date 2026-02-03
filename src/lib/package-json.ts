/**
 * Package.json manipulation utilities
 * Safely reads and modifies package.json
 */

import { fileExists, readJson, resolvePath, writeJson } from "../utils/fs";

/**
 * Package.json structure (partial)
 */
export interface PackageJson {
	name?: string;
	version?: string;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	dependencies?: Record<string, string>;
	uncov?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Result of adding scripts
 */
export interface AddScriptsResult {
	added: string[];
	skipped: string[];
}

/**
 * Read package.json from directory
 * @param path - Path to package.json file (defaults to ./package.json)
 * @throws Error if file doesn't exist or is invalid JSON
 */
export function readPackageJson(path?: string): PackageJson {
	const resolvedPath = path ?? resolvePath("package.json");

	if (!fileExists(resolvedPath)) {
		throw new Error(`package.json not found at: ${resolvedPath}`);
	}

	return readJson<PackageJson>(resolvedPath);
}

/**
 * Write package.json with 2-space indent
 * @param pkg - Package.json object to write
 * @param path - Path to write to (defaults to ./package.json)
 */
export function writePackageJson(pkg: PackageJson, path?: string): void {
	const resolvedPath = path ?? resolvePath("package.json");
	writeJson(resolvedPath, pkg);
}

/**
 * Add scripts to package.json if they don't exist
 * @param scripts - Object mapping script name to script command
 * @param path - Path to package.json (defaults to ./package.json)
 * @returns Object with arrays of added and skipped script names
 */
export function addScripts(scripts: Record<string, string>, path?: string): AddScriptsResult {
	const resolvedPath = path ?? resolvePath("package.json");
	const pkg = readPackageJson(resolvedPath);

	const added: string[] = [];
	const skipped: string[] = [];

	// Ensure scripts object exists
	if (!pkg.scripts) {
		pkg.scripts = {};
	}

	for (const [name, command] of Object.entries(scripts)) {
		if (pkg.scripts[name] !== undefined) {
			skipped.push(name);
		} else {
			pkg.scripts[name] = command;
			added.push(name);
		}
	}

	// Only write if we added something
	if (added.length > 0) {
		writePackageJson(pkg, resolvedPath);
	}

	return { added, skipped };
}

/**
 * Check if a script exists in package.json
 * @param name - Script name to check
 * @param path - Path to package.json (defaults to ./package.json)
 * @returns true if script exists, false otherwise
 */
export function hasScript(name: string, path?: string): boolean {
	const resolvedPath = path ?? resolvePath("package.json");

	if (!fileExists(resolvedPath)) {
		return false;
	}

	try {
		const pkg = readPackageJson(resolvedPath);
		return pkg.scripts?.[name] !== undefined;
	} catch {
		return false;
	}
}
