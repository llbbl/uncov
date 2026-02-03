/**
 * Configuration management
 * Reads/writes uncov.config.json or package.json uncov field
 */

import { fileExists, readJson, resolvePath } from "../utils/fs";

/**
 * Uncov configuration options
 */
export interface UncovConfig {
	threshold: number;
	exclude: string[];
	failOnLow: boolean;
	coveragePath: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: UncovConfig = {
	threshold: 10,
	exclude: [],
	failOnLow: false,
	coveragePath: "coverage/coverage-summary.json",
};

/**
 * Config file name
 */
const CONFIG_FILE_NAME = "uncov.config.json";

/**
 * Find the uncov.config.json file in the given directory
 * @param cwd - Directory to search in (defaults to process.cwd())
 * @returns Absolute path to config file, or null if not found
 */
export function findConfigFile(cwd?: string): string | null {
	const configPath = resolvePath(CONFIG_FILE_NAME, cwd);
	return fileExists(configPath) ? configPath : null;
}

/**
 * Read the uncov field from package.json
 * @param cwd - Directory containing package.json (defaults to process.cwd())
 * @returns Partial config from package.json, or null if not found
 */
export function readPackageJsonConfig(cwd?: string): Partial<UncovConfig> | null {
	const packagePath = resolvePath("package.json", cwd);

	if (!fileExists(packagePath)) {
		return null;
	}

	try {
		const pkg = readJson<Record<string, unknown>>(packagePath);
		const uncovConfig = pkg.uncov;

		if (typeof uncovConfig === "object" && uncovConfig !== null) {
			return validatePartialConfig(uncovConfig as Record<string, unknown>);
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Validate and extract valid config fields from an object
 */
function validatePartialConfig(obj: Record<string, unknown>): Partial<UncovConfig> {
	const result: Partial<UncovConfig> = {};

	if (typeof obj.threshold === "number" && obj.threshold >= 0 && obj.threshold <= 100) {
		result.threshold = obj.threshold;
	}

	if (Array.isArray(obj.exclude) && obj.exclude.every((e) => typeof e === "string")) {
		result.exclude = obj.exclude;
	}

	if (typeof obj.failOnLow === "boolean") {
		result.failOnLow = obj.failOnLow;
	}

	if (typeof obj.coveragePath === "string") {
		result.coveragePath = obj.coveragePath;
	}

	return result;
}

/**
 * Merge multiple config objects, later ones take precedence
 * @param configs - Array of partial configs (earliest is lowest priority)
 * @returns Complete merged config
 */
export function mergeConfigs(...configs: Partial<UncovConfig>[]): UncovConfig {
	const result: UncovConfig = { ...DEFAULT_CONFIG };

	for (const config of configs) {
		if (config.threshold !== undefined) {
			result.threshold = config.threshold;
		}
		if (config.exclude !== undefined) {
			result.exclude = config.exclude;
		}
		if (config.failOnLow !== undefined) {
			result.failOnLow = config.failOnLow;
		}
		if (config.coveragePath !== undefined) {
			result.coveragePath = config.coveragePath;
		}
	}

	return result;
}

/**
 * Load configuration from all sources, merged by priority:
 * 1. CLI flags (highest - passed as cliOverrides)
 * 2. uncov.config.json
 * 3. package.json uncov field
 * 4. Defaults (lowest)
 *
 * @param cliOverrides - Config from CLI flags (highest priority)
 * @param cwd - Working directory to search for config files
 * @returns Complete merged configuration
 */
export function loadConfig(cliOverrides?: Partial<UncovConfig>, cwd?: string): UncovConfig {
	const configs: Partial<UncovConfig>[] = [];

	// 1. Start with package.json config (lowest priority after defaults)
	const pkgConfig = readPackageJsonConfig(cwd);
	if (pkgConfig) {
		configs.push(pkgConfig);
	}

	// 2. Add uncov.config.json (higher priority)
	const configFilePath = findConfigFile(cwd);
	if (configFilePath) {
		try {
			const fileConfig = readJson<Record<string, unknown>>(configFilePath);
			configs.push(validatePartialConfig(fileConfig));
		} catch {
			// Ignore invalid config file, use defaults
		}
	}

	// 3. Add CLI overrides (highest priority)
	if (cliOverrides) {
		configs.push(cliOverrides);
	}

	return mergeConfigs(...configs);
}
