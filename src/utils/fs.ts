/**
 * File system utilities
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

/**
 * Validate that a path is within an allowed base directory
 * @throws Error if path escapes the base directory
 */
export function validatePath(targetPath: string, baseDir: string = process.cwd()): string {
	const resolved = resolve(baseDir, targetPath);
	const relativePath = relative(baseDir, resolved);

	// Path escapes base directory if relative path starts with .. or is absolute
	if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
		throw new Error(`Path "${targetPath}" is outside allowed directory`);
	}

	return resolved;
}

/**
 * Check if a file exists (sync)
 */
export function fileExists(path: string): boolean {
	return existsSync(path);
}

/**
 * Options for file operations with path validation
 */
export interface FileOperationOptions {
	/** Base directory to validate path against. When provided, path traversal is prevented. */
	baseDir?: string;
}

/**
 * Read and parse a JSON file (sync)
 * @throws Error with descriptive message if file doesn't exist or JSON is invalid
 * @throws Error if path escapes baseDir when baseDir is provided
 */
export function readJson<T>(path: string, options?: FileOperationOptions): T {
	const resolvedPath = options?.baseDir ? validatePath(path, options.baseDir) : path;

	let content: string;
	try {
		content = readFileSync(resolvedPath, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to read file "${path}": ${message}`);
	}

	try {
		return JSON.parse(content) as T;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Invalid JSON";
		throw new Error(`Failed to parse JSON in "${path}": ${message}`);
	}
}

/**
 * Write JSON to a file with 2-space indent (sync)
 * Creates parent directories if they don't exist
 * @throws Error if path escapes baseDir when baseDir is provided
 */
export function writeJson(path: string, data: unknown, options?: FileOperationOptions): void {
	const resolvedPath = options?.baseDir ? validatePath(path, options.baseDir) : path;

	ensureDir(dirname(resolvedPath));
	const content = `${JSON.stringify(data, null, 2)}\n`;
	try {
		writeFileSync(resolvedPath, content, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to write JSON to "${path}": ${message}`);
	}
}

/**
 * Read text file contents (sync)
 * @throws Error with descriptive message if file doesn't exist
 * @throws Error if path escapes baseDir when baseDir is provided
 */
export function readText(path: string, options?: FileOperationOptions): string {
	const resolvedPath = options?.baseDir ? validatePath(path, options.baseDir) : path;

	try {
		return readFileSync(resolvedPath, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to read file "${path}": ${message}`);
	}
}

/**
 * Write text to a file (sync)
 * Creates parent directories if they don't exist
 * @throws Error if path escapes baseDir when baseDir is provided
 */
export function writeText(path: string, content: string, options?: FileOperationOptions): void {
	const resolvedPath = options?.baseDir ? validatePath(path, options.baseDir) : path;

	ensureDir(dirname(resolvedPath));
	try {
		writeFileSync(resolvedPath, content, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to write to "${path}": ${message}`);
	}
}

/**
 * Create directory if it doesn't exist (recursive)
 */
export function ensureDir(path: string): void {
	if (!path || path === "." || path === "/") {
		return;
	}
	try {
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to create directory "${path}": ${message}`);
	}
}

/**
 * Append a line to a file (creates file if it doesn't exist)
 * Handles trailing newline properly
 * @throws Error if path escapes baseDir when baseDir is provided
 */
export function appendLine(path: string, line: string, options?: FileOperationOptions): void {
	const resolvedPath = options?.baseDir ? validatePath(path, options.baseDir) : path;

	ensureDir(dirname(resolvedPath));
	try {
		// If file exists, check if it ends with newline
		if (existsSync(resolvedPath)) {
			const content = readFileSync(resolvedPath, "utf-8");
			const needsNewlineBefore = content.length > 0 && !content.endsWith("\n");
			const lineToAppend = needsNewlineBefore ? `\n${line}\n` : `${line}\n`;
			appendFileSync(resolvedPath, lineToAppend, "utf-8");
		} else {
			// New file - just write the line with newline
			writeFileSync(resolvedPath, `${line}\n`, "utf-8");
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to append to "${path}": ${message}`);
	}
}

/**
 * Resolve a path relative to cwd
 */
export function resolvePath(relativePath: string, cwd?: string): string {
	const base = cwd ?? process.cwd();
	return resolve(base, relativePath);
}
