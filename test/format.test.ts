/**
 * Unit tests for format utilities
 */

import { describe, expect, it } from "bun:test";
import type { ParsedFileCoverage } from "../src/lib/coverage";
import {
	formatFileLine,
	formatLines,
	formatPercent,
	formatReport,
	formatReportJson,
} from "../src/utils/format";

describe("formatPercent", () => {
	it("should format 0% correctly", () => {
		expect(formatPercent(0)).toBe("  0.00%");
	});

	it("should format 100% correctly", () => {
		expect(formatPercent(100)).toBe("100.00%");
	});

	it("should format decimal percentages", () => {
		expect(formatPercent(5.26)).toBe("  5.26%");
	});

	it("should format single digit percentages", () => {
		expect(formatPercent(9.99)).toBe("  9.99%");
	});

	it("should format double digit percentages", () => {
		expect(formatPercent(50)).toBe(" 50.00%");
	});
});

describe("formatLines", () => {
	it("should format line counts with padding", () => {
		expect(formatLines(10, 100)).toBe("LH   10/LF  100");
	});

	it("should format zero lines", () => {
		expect(formatLines(0, 0)).toBe("LH    0/LF    0");
	});

	it("should format large line counts", () => {
		expect(formatLines(1000, 9999)).toBe("LH 1000/LF 9999");
	});

	it("should format single digit line counts", () => {
		expect(formatLines(1, 5)).toBe("LH    1/LF    5");
	});
});

describe("formatFileLine", () => {
	it("should format a file coverage line", () => {
		const file: ParsedFileCoverage = {
			path: "src/utils/format.ts",
			linesPct: 75.5,
			linesCovered: 30,
			linesTotal: 40,
		};
		expect(formatFileLine(file)).toBe(" 75.50%  LH   30/LF   40   src/utils/format.ts");
	});

	it("should format a file with zero coverage", () => {
		const file: ParsedFileCoverage = {
			path: "src/empty.ts",
			linesPct: 0,
			linesCovered: 0,
			linesTotal: 10,
		};
		expect(formatFileLine(file)).toBe("  0.00%  LH    0/LF   10   src/empty.ts");
	});
});

describe("formatReport", () => {
	it("should show message when no files below threshold", () => {
		expect(formatReport([], 10)).toBe("No files at or below 10% line coverage.");
	});

	it("should show message with different threshold", () => {
		expect(formatReport([], 50)).toBe("No files at or below 50% line coverage.");
	});

	it("should format report with files", () => {
		const files: ParsedFileCoverage[] = [
			{
				path: "src/a.ts",
				linesPct: 5,
				linesCovered: 1,
				linesTotal: 20,
			},
			{
				path: "src/b.ts",
				linesPct: 10,
				linesCovered: 10,
				linesTotal: 100,
			},
		];
		const report = formatReport(files, 10);
		expect(report).toContain("Files at or below 10% line coverage: 2");
		expect(report).toContain("src/a.ts");
		expect(report).toContain("src/b.ts");
	});
});

describe("formatReportJson", () => {
	it("should format empty report as JSON", () => {
		const json = formatReportJson([], 10);
		const parsed = JSON.parse(json);
		expect(parsed.threshold).toBe(10);
		expect(parsed.count).toBe(0);
		expect(parsed.files).toEqual([]);
	});

	it("should format report with files as JSON", () => {
		const files: ParsedFileCoverage[] = [
			{
				path: "src/test.ts",
				linesPct: 25.5,
				linesCovered: 25,
				linesTotal: 100,
			},
		];
		const json = formatReportJson(files, 30);
		const parsed = JSON.parse(json);
		expect(parsed.threshold).toBe(30);
		expect(parsed.count).toBe(1);
		expect(parsed.files[0].path).toBe("src/test.ts");
		expect(parsed.files[0].linesPct).toBe(25.5);
		expect(parsed.files[0].linesCovered).toBe(25);
		expect(parsed.files[0].linesTotal).toBe(100);
	});
});
