/**
 * Colorized terminal output utilities
 * Respects NO_COLOR environment variable and TTY detection
 */

/**
 * Check if color output is supported
 * - TTY must be connected
 * - NO_COLOR env must not be set
 * - Can be disabled via noColor parameter
 */
export function isColorSupported(noColor = false): boolean {
	if (noColor) {
		return false;
	}
	if (process.env.NO_COLOR !== undefined) {
		return false;
	}
	return Boolean(process.stdout.isTTY);
}

/**
 * Create a color function that wraps text in ANSI codes
 */
function makeColor(code: string, enabled: boolean): (s: string) => string {
	if (!enabled) {
		return (s: string) => s;
	}
	return (s: string) => `\x1b[${code}m${s}\x1b[0m`;
}

/**
 * Color functions for terminal output
 */
export interface Colors {
	red: (s: string) => string;
	green: (s: string) => string;
	yellow: (s: string) => string;
	cyan: (s: string) => string;
	bold: (s: string) => string;
	dim: (s: string) => string;
}

/**
 * Create color functions based on whether color is supported
 */
export function createColors(noColor = false): Colors {
	const enabled = isColorSupported(noColor);

	return {
		red: makeColor("31", enabled),
		green: makeColor("32", enabled),
		yellow: makeColor("33", enabled),
		cyan: makeColor("36", enabled),
		bold: makeColor("1", enabled),
		dim: makeColor("2", enabled),
	};
}
