/**
 * Report command - Parse coverage data and display files below threshold
 */

import { loadConfig } from "../lib/config";
import {
	type CoverageSummary,
	filterBelowThreshold,
	parseCoverageSummary,
	sortByPercentage,
} from "../lib/coverage";
import { createColors } from "../utils/colors";
import { formatReport, formatReportJson } from "../utils/format";
import { fileExists, resolvePath } from "../utils/fs";
import { createLogger } from "../utils/logger";

export interface ReportOptions {
	threshold?: number;
	fail?: boolean;
	json?: boolean;
	coveragePath?: string;
	noColor?: boolean;
	verbose?: boolean;
}

/**
 * Report command - reads coverage data and reports files below threshold
 *
 * Exit codes:
 * - 0: Success (or low coverage found but --fail not set)
 * - 1: Low coverage found AND --fail set
 * - 2: Missing coverage file or config error
 */
export async function reportCommand(options: ReportOptions): Promise<number> {
	const colors = createColors(options.noColor);
	const log = createLogger(options.verbose ?? false);

	log.verbose("Loading configuration...");

	// Load config, merging CLI options with config file values
	const config = loadConfig({
		threshold: options.threshold,
		failOnLow: options.fail,
		coveragePath: options.coveragePath,
	});

	log.verbose(`Config loaded: threshold=${config.threshold}, failOnLow=${config.failOnLow}`);

	const coveragePath = resolvePath(config.coveragePath);
	log.verbose(`Coverage path: ${coveragePath}`);

	// Check if coverage file exists
	if (!fileExists(coveragePath)) {
		if (options.json) {
			console.log(
				JSON.stringify(
					{
						error: "Coverage file not found",
						path: coveragePath,
					},
					null,
					2,
				),
			);
		} else {
			console.error(colors.red(`Error: Coverage file not found: ${coveragePath}`));
			console.error("Run your test coverage command first (e.g., 'pnpm test:coverage')");
		}
		return 2;
	}

	// Parse coverage summary
	let summary: CoverageSummary;
	try {
		log.verbose("Parsing coverage summary...");
		summary = parseCoverageSummary(coveragePath);
		log.verbose(`Parsed ${Object.keys(summary).length - 1} files from coverage summary`);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		if (options.json) {
			console.log(
				JSON.stringify(
					{
						error: "Failed to parse coverage file",
						details: message,
					},
					null,
					2,
				),
			);
		} else {
			console.error(colors.red(`Error: Failed to parse coverage file: ${message}`));
		}
		return 2;
	}

	// Filter and sort files
	log.verbose(`Filtering files at or below ${config.threshold}% threshold...`);
	const filesBelow = filterBelowThreshold(summary, config.threshold);
	log.verbose(`Found ${filesBelow.length} files below threshold`);

	log.verbose("Sorting files by coverage percentage...");
	const sortedFiles = sortByPercentage(filesBelow);

	// Output results
	if (options.json) {
		console.log(formatReportJson(sortedFiles, config.threshold));
	} else {
		console.log(formatReport(sortedFiles, config.threshold, colors));
	}

	// Determine exit code
	if (sortedFiles.length > 0 && config.failOnLow) {
		return 1;
	}

	return 0;
}
