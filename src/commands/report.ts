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
import { formatReport, formatReportJson } from "../utils/format";
import { fileExists, resolvePath } from "../utils/fs";

export interface ReportOptions {
	threshold?: number;
	fail?: boolean;
	json?: boolean;
	coveragePath?: string;
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
	// Load config, merging CLI options with config file values
	const config = loadConfig({
		threshold: options.threshold,
		failOnLow: options.fail,
		coveragePath: options.coveragePath,
	});

	const coveragePath = resolvePath(config.coveragePath);

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
			console.error(`Error: Coverage file not found: ${coveragePath}`);
			console.error("Run your test coverage command first (e.g., 'pnpm test:coverage')");
		}
		return 2;
	}

	// Parse coverage summary
	let summary: CoverageSummary;
	try {
		summary = parseCoverageSummary(coveragePath);
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
			console.error(`Error: Failed to parse coverage file: ${message}`);
		}
		return 2;
	}

	// Filter and sort files
	const filesBelow = filterBelowThreshold(summary, config.threshold);
	const sortedFiles = sortByPercentage(filesBelow);

	// Output results
	if (options.json) {
		console.log(formatReportJson(sortedFiles, config.threshold));
	} else {
		console.log(formatReport(sortedFiles, config.threshold));
	}

	// Determine exit code
	if (sortedFiles.length > 0 && config.failOnLow) {
		return 1;
	}

	return 0;
}
