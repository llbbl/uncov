/**
 * Configuration management
 * Reads/writes uncov.config.json or package.json uncov field
 */

/**
 * Uncov configuration options
 */
export interface UncovConfig {
	threshold?: number;
	exclude?: string[];
	failOnLow?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<UncovConfig> = {
	threshold: 10,
	exclude: [],
	failOnLow: false,
};

/**
 * Load configuration from uncov.config.json or package.json
 */
export async function loadConfig(_cwd?: string): Promise<UncovConfig> {
	// TODO: Implement config loading
	// - Check for uncov.config.json
	// - Fall back to package.json uncov field
	// - Merge with defaults
	return DEFAULT_CONFIG;
}

/**
 * Write configuration to uncov.config.json
 */
export async function writeConfig(_config: UncovConfig, _cwd?: string): Promise<void> {
	// TODO: Implement config writing
}
