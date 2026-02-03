/**
 * File system utilities
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Check if a file exists
 */
export function fileExists(path: string): boolean {
	return existsSync(path);
}

/**
 * Read a JSON file and parse it
 */
export async function readJsonFile<T>(path: string): Promise<T | null> {
	try {
		const content = await readFile(path, "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Write a JSON file with pretty formatting
 */
export async function writeJsonFile<T>(path: string, data: T): Promise<void> {
	const content = `${JSON.stringify(data, null, 2)}\n`;
	await writeFile(path, content, "utf-8");
}

/**
 * Resolve a path relative to cwd
 */
export function resolvePath(relativePath: string, cwd?: string): string {
	const base = cwd ?? process.cwd();
	return resolve(base, relativePath);
}
