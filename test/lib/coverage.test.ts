/**
 * Unit tests for coverage parsing utilities
 */

import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { parseCoverageSummary, validateCoverageSummary } from "../../src/lib/coverage";

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
});
