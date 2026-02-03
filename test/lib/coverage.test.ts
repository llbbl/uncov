/**
 * Unit tests for coverage parsing utilities
 */

import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
	filterBelowThreshold,
	parseCoverageSummary,
	sortByPercentage,
	validateCoverageSummary,
} from "../../src/lib/coverage";

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");

describe("coverage utilities", () => {
	describe("validateCoverageSummary", () => {
		it("should accept valid coverage data", () => {
			const validData = {
				total: {
					lines: { total: 100, covered: 50, skipped: 0, pct: 50 },
					statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
					functions: { total: 20, covered: 10, skipped: 0, pct: 50 },
					branches: { total: 30, covered: 15, skipped: 0, pct: 50 },
				},
				"/src/file.ts": {
					lines: { total: 50, covered: 25, skipped: 0, pct: 50 },
					statements: { total: 50, covered: 25, skipped: 0, pct: 50 },
					functions: { total: 10, covered: 5, skipped: 0, pct: 50 },
					branches: { total: 15, covered: 8, skipped: 0, pct: 53.33 },
				},
			};

			const result = validateCoverageSummary(validData);
			expect(result).toEqual(validData);
		});

		it("should throw for null input", () => {
			expect(() => validateCoverageSummary(null)).toThrow("Coverage summary must be an object");
		});

		it("should throw for undefined input", () => {
			expect(() => validateCoverageSummary(undefined)).toThrow(
				"Coverage summary must be an object",
			);
		});

		it("should throw for non-object input", () => {
			expect(() => validateCoverageSummary("string")).toThrow("Coverage summary must be an object");
			expect(() => validateCoverageSummary(123)).toThrow("Coverage summary must be an object");
			expect(() => validateCoverageSummary([])).toThrow(
				'Coverage summary missing valid "total" field',
			);
		});

		it("should throw for missing total field", () => {
			const data = {
				"/src/file.ts": {
					lines: { total: 50, covered: 25, skipped: 0, pct: 50 },
				},
			};

			expect(() => validateCoverageSummary(data)).toThrow(
				'Coverage summary missing valid "total" field',
			);
		});

		it("should throw for total with missing lines metric", () => {
			const data = {
				total: {
					statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
					functions: { total: 20, covered: 10, skipped: 0, pct: 50 },
					branches: { total: 30, covered: 15, skipped: 0, pct: 50 },
				},
			};

			expect(() => validateCoverageSummary(data)).toThrow(
				'Coverage summary missing valid "total" field',
			);
		});

		it("should throw for lines metric with missing required fields", () => {
			const data = {
				total: {
					lines: { total: 100 }, // missing covered and pct
					statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
					functions: { total: 20, covered: 10, skipped: 0, pct: 50 },
					branches: { total: 30, covered: 15, skipped: 0, pct: 50 },
				},
			};

			expect(() => validateCoverageSummary(data)).toThrow(
				'Coverage summary missing valid "total" field',
			);
		});

		it("should throw for file entry with invalid coverage data", () => {
			const data = {
				total: {
					lines: { total: 100, covered: 50, skipped: 0, pct: 50 },
					statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
					functions: { total: 20, covered: 10, skipped: 0, pct: 50 },
					branches: { total: 30, covered: 15, skipped: 0, pct: 50 },
				},
				"/src/bad-file.ts": {
					// missing lines metric entirely
					statements: { total: 50, covered: 25, skipped: 0, pct: 50 },
				},
			};

			expect(() => validateCoverageSummary(data)).toThrow(
				"Invalid coverage data for file: /src/bad-file.ts",
			);
		});

		it("should throw for lines metric with wrong types", () => {
			const data = {
				total: {
					lines: { total: "100", covered: 50, skipped: 0, pct: 50 }, // total is string, not number
					statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
					functions: { total: 20, covered: 10, skipped: 0, pct: 50 },
					branches: { total: 30, covered: 15, skipped: 0, pct: 50 },
				},
			};

			expect(() => validateCoverageSummary(data)).toThrow(
				'Coverage summary missing valid "total" field',
			);
		});

		it("should accept data with only total (no files)", () => {
			const data = {
				total: {
					lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
					statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
					functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
					branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
				},
			};

			const result = validateCoverageSummary(data);
			expect(result.total.lines.pct).toBe(0);
		});
	});

	describe("parseCoverageSummary", () => {
		it("should parse valid coverage-summary.json fixture", () => {
			const result = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));

			expect(result.total.lines.pct).toBe(40);
			expect(result.total.lines.total).toBe(400);
			expect(result.total.lines.covered).toBe(160);
		});

		it("should throw for coverage-summary-missing-fields.json fixture", () => {
			expect(() =>
				parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-missing-fields.json")),
			).toThrow('Coverage summary missing valid "total" field');
		});

		it("should throw for coverage-summary-invalid.json fixture (malformed JSON)", () => {
			expect(() =>
				parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-invalid.json")),
			).toThrow("Failed to parse JSON");
		});

		it("should throw for non-existent file", () => {
			expect(() => parseCoverageSummary("/path/to/nonexistent/file.json")).toThrow(
				"Failed to read file",
			);
		});

		it("should parse fixture with multiple files", () => {
			const result = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));

			// Check that individual files are present
			expect(result["/project/src/uncovered.ts"]).toBeDefined();
			expect(result["/project/src/uncovered.ts"].lines.pct).toBe(0);

			expect(result["/project/src/full-coverage.ts"]).toBeDefined();
			expect(result["/project/src/full-coverage.ts"].lines.pct).toBe(100);
		});
	});

	describe("filterBelowThreshold", () => {
		it("should filter files at or below threshold", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));
			const result = filterBelowThreshold(summary, 10);

			expect(result).toHaveLength(2);
			expect(result.find((f) => f.path === "/project/src/uncovered.ts")).toBeDefined();
			expect(result.find((f) => f.path === "/project/src/low-coverage.ts")).toBeDefined();
		});

		it("should include files at exact threshold", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));
			const result = filterBelowThreshold(summary, 10);

			const lowCoverage = result.find((f) => f.path === "/project/src/low-coverage.ts");
			expect(lowCoverage).toBeDefined();
			expect(lowCoverage?.linesPct).toBe(10);
		});

		it("should exclude files above threshold", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));
			const result = filterBelowThreshold(summary, 10);

			expect(result.find((f) => f.path === "/project/src/partial.ts")).toBeUndefined();
			expect(result.find((f) => f.path === "/project/src/full-coverage.ts")).toBeUndefined();
		});

		it("should return empty array for all-covered fixture at threshold 10", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-all-covered.json"));
			const result = filterBelowThreshold(summary, 10);

			expect(result).toHaveLength(0);
		});

		it("should return all files for all-zero fixture at any threshold", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-all-zero.json"));
			const result = filterBelowThreshold(summary, 0);

			expect(result).toHaveLength(3);
		});

		it("should return all files when threshold is 100", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));
			const result = filterBelowThreshold(summary, 100);

			expect(result).toHaveLength(4);
		});

		it("should return empty array for empty fixture", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-empty.json"));
			const result = filterBelowThreshold(summary, 100);

			expect(result).toHaveLength(0);
		});

		it("should include correct coverage data in result", () => {
			const summary = parseCoverageSummary(join(FIXTURES_DIR, "coverage-summary-valid.json"));
			const result = filterBelowThreshold(summary, 0);

			expect(result).toHaveLength(1);
			const uncovered = result[0];
			expect(uncovered?.path).toBe("/project/src/uncovered.ts");
			expect(uncovered?.linesPct).toBe(0);
			expect(uncovered?.linesCovered).toBe(0);
			expect(uncovered?.linesTotal).toBe(100);
		});
	});

	describe("sortByPercentage", () => {
		it("should sort files by coverage percentage ascending", () => {
			const files = [
				{ path: "/a.ts", linesPct: 50, linesCovered: 50, linesTotal: 100 },
				{ path: "/b.ts", linesPct: 10, linesCovered: 10, linesTotal: 100 },
				{ path: "/c.ts", linesPct: 0, linesCovered: 0, linesTotal: 100 },
				{ path: "/d.ts", linesPct: 100, linesCovered: 100, linesTotal: 100 },
			];

			const result = sortByPercentage(files);

			expect(result[0]?.path).toBe("/c.ts");
			expect(result[1]?.path).toBe("/b.ts");
			expect(result[2]?.path).toBe("/a.ts");
			expect(result[3]?.path).toBe("/d.ts");
		});

		it("should not mutate the original array", () => {
			const files = [
				{ path: "/a.ts", linesPct: 50, linesCovered: 50, linesTotal: 100 },
				{ path: "/b.ts", linesPct: 10, linesCovered: 10, linesTotal: 100 },
			];

			const result = sortByPercentage(files);

			expect(result).not.toBe(files);
			expect(files[0]?.path).toBe("/a.ts");
			expect(files[1]?.path).toBe("/b.ts");
		});

		it("should handle empty array", () => {
			const result = sortByPercentage([]);
			expect(result).toEqual([]);
		});

		it("should handle single element", () => {
			const files = [{ path: "/a.ts", linesPct: 50, linesCovered: 50, linesTotal: 100 }];
			const result = sortByPercentage(files);

			expect(result).toHaveLength(1);
			expect(result[0]?.path).toBe("/a.ts");
		});

		it("should handle files with same percentage", () => {
			const files = [
				{ path: "/a.ts", linesPct: 50, linesCovered: 50, linesTotal: 100 },
				{ path: "/b.ts", linesPct: 50, linesCovered: 25, linesTotal: 50 },
			];

			const result = sortByPercentage(files);

			expect(result).toHaveLength(2);
			// Both have 50%, order doesn't matter but they should both be present
			expect(result.map((f) => f.path).sort()).toEqual(["/a.ts", "/b.ts"]);
		});
	});
});
