/**
 * Tests for the check command
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkCommand } from "../../src/commands/check";

const TEST_DIR = join(import.meta.dir, "..", ".test-check");

describe("checkCommand", () => {
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

	describe("when no setup exists", () => {
		it("should fail when no vitest config exists", async () => {
			process.chdir(TEST_DIR);

			// Create minimal package.json
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));

			const exitCode = await checkCommand();

			expect(exitCode).toBe(1);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Vitest config not found");
		});

		it("should fail when no coverage-summary.json exists", async () => {
			process.chdir(TEST_DIR);

			// Create minimal setup without coverage file
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));
			writeFileSync(
				join(TEST_DIR, "vitest.config.ts"),
				`
export default { test: { coverage: {} } }
`,
			);

			const exitCode = await checkCommand();

			expect(exitCode).toBe(1);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Coverage summary not found");
			expect(output).toContain("test:coverage");
		});

		it("should fail when no test:coverage script exists", async () => {
			process.chdir(TEST_DIR);

			// Create setup without scripts
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));

			const exitCode = await checkCommand();

			expect(exitCode).toBe(1);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Script not found: test:coverage");
		});
	});

	describe("when partial setup exists", () => {
		it("should pass vitest config check when config exists", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Vitest config found");
		});

		it("should fail coverage config check when no coverage in config", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			const exitCode = await checkCommand();

			expect(exitCode).toBe(1);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Coverage config not found in vitest config");
		});

		it("should pass coverage config check when coverage configured", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));
			writeFileSync(
				join(TEST_DIR, "vitest.config.ts"),
				`
export default {
  test: {
    coverage: {
      provider: 'v8'
    }
  }
}
`,
			);

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Coverage config detected");
		});

		it("should pass scripts check when test:coverage exists", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(
				join(TEST_DIR, "package.json"),
				JSON.stringify({
					name: "test",
					scripts: { "test:coverage": "vitest run --coverage" },
				}),
			);

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Scripts configured: test:coverage");
		});
	});

	describe("when full setup exists", () => {
		beforeEach(() => {
			process.chdir(TEST_DIR);

			// Create full setup
			writeFileSync(
				join(TEST_DIR, "package.json"),
				JSON.stringify({
					name: "test",
					scripts: { "test:coverage": "vitest run --coverage" },
				}),
			);

			writeFileSync(
				join(TEST_DIR, "vitest.config.ts"),
				`
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json-summary']
    }
  }
}
`,
			);

			// Create coverage directory and summary
			mkdirSync(join(TEST_DIR, "coverage"), { recursive: true });
			writeFileSync(
				join(TEST_DIR, "coverage", "coverage-summary.json"),
				JSON.stringify({
					total: {
						lines: { total: 100, covered: 50, skipped: 0, pct: 50 },
						statements: { total: 100, covered: 50, skipped: 0, pct: 50 },
						functions: { total: 10, covered: 5, skipped: 0, pct: 50 },
						branches: { total: 20, covered: 10, skipped: 0, pct: 50 },
					},
				}),
			);
		});

		it("should return exit code 0 when all checks pass", async () => {
			const exitCode = await checkCommand();

			expect(exitCode).toBe(0);
		});

		it("should output all checks passed message", async () => {
			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("All checks passed!");
		});

		it("should show success for each check", async () => {
			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Vitest config found");
			expect(output).toContain("[ok] Coverage config detected");
			expect(output).toContain("[ok] Coverage summary exists");
			expect(output).toContain("[ok] Scripts configured");
		});
	});

	describe("output format", () => {
		it("should show hints for failed checks", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Run 'uncov init'");
		});

		it("should count failed checks correctly", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toMatch(/\d+ check(s)? failed/);
		});

		it("should use singular 'check' when 1 check fails", async () => {
			process.chdir(TEST_DIR);

			// Setup with only one failure (missing coverage-summary.json)
			writeFileSync(
				join(TEST_DIR, "package.json"),
				JSON.stringify({
					name: "test",
					scripts: { "test:coverage": "vitest run --coverage" },
				}),
			);
			writeFileSync(
				join(TEST_DIR, "vitest.config.ts"),
				"export default { test: { coverage: {} } }",
			);

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("1 check failed");
		});
	});

	describe("with vite.config.ts", () => {
		it("should detect coverage in vite.config.ts", async () => {
			process.chdir(TEST_DIR);

			writeFileSync(
				join(TEST_DIR, "package.json"),
				JSON.stringify({
					name: "test",
					scripts: { "test:coverage": "vitest run --coverage" },
				}),
			);

			// Use vite.config.ts instead of vitest.config.ts
			writeFileSync(
				join(TEST_DIR, "vite.config.ts"),
				`
export default {
  test: {
    coverage: {
      provider: 'v8'
    }
  }
}
`,
			);

			await checkCommand();

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Vitest config found");
			expect(output).toContain("vite.config.ts");
		});
	});

	describe("with --verbose flag", () => {
		it("should output debug information to stderr", async () => {
			process.chdir(TEST_DIR);

			// Create minimal package.json
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test" }));

			await checkCommand({ verbose: true });

			const errorOutput = consoleErrorSpy.mock.calls.flat().join("\n");
			expect(errorOutput).toContain("[verbose]");
		});
	});
});
