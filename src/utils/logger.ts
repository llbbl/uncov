/**
 * Logger utility for verbose and standard output
 * Verbose output goes to stderr to not interfere with --json output
 */

export interface Logger {
	verbose: (msg: string) => void;
	info: (msg: string) => void;
	error: (msg: string) => void;
}

/**
 * Create a logger instance with verbose support
 * @param verbose - Whether to enable verbose output
 * @returns Logger instance
 */
export function createLogger(verbose: boolean): Logger {
	return {
		verbose: (msg: string) => {
			if (verbose) {
				console.error(`[verbose] ${msg}`);
			}
		},
		info: (msg: string) => console.log(msg),
		error: (msg: string) => console.error(msg),
	};
}
