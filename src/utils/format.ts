/**
 * Output formatting utilities
 */

import type { ParsedFileCoverage } from "../lib/coverage";

/**
 * Format coverage percentage for display
 * Right-aligned with fixed width for alignment
 */
export function formatPercent(pct: number): string {
	return `${pct.toFixed(2).padStart(6)}%`;
}

/**
 * Format line count for display (e.g., "LH 10/LF 100")
 */
export function formatLines(covered: number, total: number): string {
	const coveredStr = covered.toString().padStart(4);
	const totalStr = total.toString().padStart(4);
	return `LH ${coveredStr}/LF ${totalStr}`;
}

/**
 * Format a single file coverage line
 */
export function formatFileLine(file: ParsedFileCoverage): string {
	const pct = formatPercent(file.linesPct);
	const lines = formatLines(file.linesCovered, file.linesTotal);
	return `${pct}  ${lines}   ${file.path}`;
}

/**
 * Format the complete report output
 */
export function formatReport(files: ParsedFileCoverage[], threshold: number): string {
	if (files.length === 0) {
		return `No files at or below ${threshold}% line coverage.`;
	}

	const header = `Files at or below ${threshold}% line coverage: ${files.length}\n`;
	const fileLines = files.map((f) => `  ${formatFileLine(f)}`).join("\n");

	return `${header}\n${fileLines}`;
}

/**
 * Format report as JSON
 */
export function formatReportJson(files: ParsedFileCoverage[], threshold: number): string {
	return JSON.stringify(
		{
			threshold,
			count: files.length,
			files: files.map((f) => ({
				path: f.path,
				linesPct: f.linesPct,
				linesCovered: f.linesCovered,
				linesTotal: f.linesTotal,
			})),
		},
		null,
		2,
	);
}
