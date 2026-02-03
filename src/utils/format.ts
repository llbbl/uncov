/**
 * Output formatting utilities
 */

import type { ParsedFileCoverage } from "../lib/coverage";
import { type Colors, createColors } from "./colors";

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
 * Format a single file coverage line with optional colors
 * - Red for 0% coverage
 * - Yellow for low coverage (> 0%)
 */
export function formatFileLine(file: ParsedFileCoverage, colors?: Colors): string {
	const pct = formatPercent(file.linesPct);
	const lines = formatLines(file.linesCovered, file.linesTotal);
	const line = `${pct}  ${lines}   ${file.path}`;

	if (!colors) {
		return line;
	}

	// Apply color based on coverage percentage
	if (file.linesPct === 0) {
		return colors.red(line);
	}
	return colors.yellow(line);
}

/**
 * Format the complete report output
 */
export function formatReport(
	files: ParsedFileCoverage[],
	threshold: number,
	colors?: Colors,
): string {
	if (files.length === 0) {
		const msg = `No files at or below ${threshold}% line coverage.`;
		return colors ? colors.green(msg) : msg;
	}

	const header = `Files at or below ${threshold}% line coverage: ${files.length}\n`;
	const fileLines = files.map((f) => `  ${formatFileLine(f, colors)}`).join("\n");

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
