/**
 * Tests for the report command
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { reportCommand } from "../../src/commands/report";

const TEST_DIR = join(import.meta.dir, "..", ".test-report");
const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");

describe("reportCommand", () => {
	let consoleLogSpy: ReturnType<typeof spyOn>;
	let consoleErrorSpy: ReturnType<typeof spyOn>;
	let originalCwd: string;

	beforeEach(() => {
		// Spy on console methods
		consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

		// Save original cwd
		originalCwd = process.cwd();

		// Create test directory
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		// Restore console methods
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();

		// Restore cwd
		process.chdir(originalCwd);

		// Cleanup test directory
		try {
			rmSync(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("with valid coverage file", () => {
		it("should report files below default threshold (10%)", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			const exitCode = await reportCommand({
				coveragePath,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Files at or below 10% line coverage:");
			expect(output).toContain("renderer.ts");
			expect(output).toContain("bootstrap.ts");
			expect(output).toContain("engine.ts");
		});

		it("should report files below custom threshold", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 5,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Files at or below 5% line coverage:");
			// Only 0% files should appear
			expect(output).toContain("renderer.ts");
			expect(output).not.toContain("engine.ts"); // 10% > 5%
		});

		it("should return exit code 0 when no files below threshold", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary-all-covered.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 10,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("No files at or below 10% line coverage");
		});

		it("should return exit code 1 when files below threshold and --fail set", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 10,
				fail: true,
			});

			expect(exitCode).toBe(1);
		});

		it("should return exit code 0 when files below threshold but --fail not set", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 10,
				fail: false,
			});

			expect(exitCode).toBe(0);
		});

		it("should sort files by coverage percentage ascending", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			await reportCommand({
				coveragePath,
				threshold: 10,
			});

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			const rendererIndex = output.indexOf("renderer.ts");
			const bootstrapIndex = output.indexOf("bootstrap.ts");
			const engineIndex = output.indexOf("engine.ts");

			// renderer (0%) should come before bootstrap (5.26%) should come before engine (10%)
			expect(rendererIndex).toBeLessThan(bootstrapIndex);
			expect(bootstrapIndex).toBeLessThan(engineIndex);
		});
	});

	describe("JSON output", () => {
		it("should output JSON when --json flag is set", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 10,
				json: true,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("");
			const parsed = JSON.parse(output);

			expect(parsed).toHaveProperty("threshold", 10);
			expect(parsed).toHaveProperty("count");
			expect(parsed).toHaveProperty("files");
			expect(Array.isArray(parsed.files)).toBe(true);
		});

		it("should include file details in JSON output", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
			await reportCommand({
				coveragePath,
				threshold: 0,
				json: true,
			});

			const output = consoleLogSpy.mock.calls.flat().join("");
			const parsed = JSON.parse(output);

			expect(parsed.files.length).toBeGreaterThan(0);
			const firstFile = parsed.files[0];
			expect(firstFile).toHaveProperty("path");
			expect(firstFile).toHaveProperty("linesPct");
			expect(firstFile).toHaveProperty("linesCovered");
			expect(firstFile).toHaveProperty("linesTotal");
		});
	});

	describe("error handling", () => {
		it("should return exit code 2 when coverage file not found", async () => {
			const exitCode = await reportCommand({
				coveragePath: "/nonexistent/path/coverage-summary.json",
			});

			expect(exitCode).toBe(2);

			const errorOutput = consoleErrorSpy.mock.calls.flat().join("\n");
			expect(errorOutput).toContain("Coverage file not found");
		});

		it("should output JSON error when coverage file not found and --json set", async () => {
			const exitCode = await reportCommand({
				coveragePath: "/nonexistent/path/coverage-summary.json",
				json: true,
			});

			expect(exitCode).toBe(2);

			const output = consoleLogSpy.mock.calls.flat().join("");
			const parsed = JSON.parse(output);
			expect(parsed).toHaveProperty("error", "Coverage file not found");
		});

		it("should return exit code 2 when coverage file is invalid", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary-invalid.json");
			const exitCode = await reportCommand({
				coveragePath,
			});

			expect(exitCode).toBe(2);

			const errorOutput = consoleErrorSpy.mock.calls.flat().join("\n");
			expect(errorOutput).toContain("Failed to parse coverage file");
		});
	});

	describe("with threshold 0", () => {
		it("should only show 0% coverage files", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary-valid.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 0,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("uncovered.ts");
			expect(output).not.toContain("low-coverage.ts"); // 10% > 0%
		});
	});

	describe("with threshold 100", () => {
		it("should show all files", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary-valid.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 100,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Files at or below 100% line coverage: 4");
		});
	});

	describe("with empty coverage data", () => {
		it("should report no files below threshold", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary-empty.json");
			const exitCode = await reportCommand({
				coveragePath,
				threshold: 100,
			});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("No files at or below 100% line coverage");
		});
	});

	describe("config file integration", () => {
		it("should use coveragePath from config when not specified via CLI", async () => {
			// Create a test directory with config
			process.chdir(TEST_DIR);

			// Create package.json with uncov config
			const packageJson = {
				name: "test",
				uncov: {
					coveragePath: resolve(FIXTURES_DIR, "coverage-summary.json"),
				},
			};
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify(packageJson, null, 2));

			const exitCode = await reportCommand({});

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Files at or below 10% line coverage:");
		});
	});

	describe("with --verbose flag", () => {
		it("should output debug information to stderr", async () => {
			const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");

			await reportCommand({ verbose: true, coveragePath });

			const errorOutput = consoleErrorSpy.mock.calls.flat().join("\n");
			expect(errorOutput).toContain("[verbose]");
		});
	});
});
