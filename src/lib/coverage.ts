/**
 * Coverage parsing utilities
 * Handles reading and parsing coverage-summary.json from Vitest/Istanbul
 */

import { readJson } from "../utils/fs";

/**
 * Coverage metrics for a single file
 */
export interface FileCoverage {
	lines: CoverageMetric;
	statements: CoverageMetric;
	functions: CoverageMetric;
	branches: CoverageMetric;
}

/**
 * Individual coverage metric (lines, statements, etc.)
 */
export interface CoverageMetric {
	total: number;
	covered: number;
	skipped: number;
	pct: number;
}

/**
 * Coverage summary data structure from coverage-summary.json
 */
export interface CoverageSummary {
	total: FileCoverage;
	[filePath: string]: FileCoverage;
}

/**
 * Parsed file with coverage data
 */
export interface ParsedFileCoverage {
	path: string;
	linesPct: number;
	linesCovered: number;
	linesTotal: number;
}

/**
 * Type guard to validate a coverage metric object
 */
function isValidCoverageMetric(obj: unknown): obj is CoverageMetric {
	if (typeof obj !== "object" || obj === null) return false;
	const metric = obj as Record<string, unknown>;
	return (
		typeof metric.total === "number" &&
		typeof metric.covered === "number" &&
		typeof metric.pct === "number"
	);
}

/**
 * Type guard to validate file coverage data (requires at least lines metric)
 */
function isValidFileCoverage(obj: unknown): obj is FileCoverage {
	if (typeof obj !== "object" || obj === null) return false;
	const coverage = obj as Record<string, unknown>;
	return isValidCoverageMetric(coverage.lines);
}

/**
 * Validate and parse raw coverage data into a CoverageSummary
 * @throws Error if data structure is invalid
 */
export function validateCoverageSummary(data: unknown): CoverageSummary {
	if (typeof data !== "object" || data === null) {
		throw new Error("Coverage summary must be an object");
	}

	const summary = data as Record<string, unknown>;

	if (!isValidFileCoverage(summary.total)) {
		throw new Error('Coverage summary missing valid "total" field');
	}

	// Validate each file entry
	for (const [key, value] of Object.entries(summary)) {
		if (key !== "total" && !isValidFileCoverage(value)) {
			throw new Error(`Invalid coverage data for file: ${key}`);
		}
	}

	return summary as CoverageSummary;
}

/**
 * Read and parse coverage-summary.json with validation
 * @throws Error if file doesn't exist, JSON is invalid, or coverage data structure is invalid
 */
export function parseCoverageSummary(coveragePath: string): CoverageSummary {
	const data = readJson<unknown>(coveragePath);
	return validateCoverageSummary(data);
}

/**
 * Filter files at or below a coverage threshold
 * @param summary - Coverage summary data
 * @param threshold - Maximum coverage percentage to include (inclusive)
 * @returns Array of files at or below the threshold
 */
export function filterBelowThreshold(
	summary: CoverageSummary,
	threshold: number,
): ParsedFileCoverage[] {
	const result: ParsedFileCoverage[] = [];

	for (const [path, coverage] of Object.entries(summary)) {
		// Skip the 'total' entry
		if (path === "total") continue;

		const linesPct = coverage.lines.pct;
		if (linesPct <= threshold) {
			result.push({
				path,
				linesPct,
				linesCovered: coverage.lines.covered,
				linesTotal: coverage.lines.total,
			});
		}
	}

	return result;
}

/**
 * Sort files by coverage percentage (ascending - lowest first)
 * @param files - Array of parsed file coverage data
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortByPercentage(files: ParsedFileCoverage[]): ParsedFileCoverage[] {
	return [...files].sort((a, b) => a.linesPct - b.linesPct);
}
