/**
 * CLI integration tests
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };

const TEST_DIR = join(import.meta.dir, ".test-cli");
const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const PROJECT_ROOT = resolve(import.meta.dir, "..");

describe("CLI", () => {
	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("should show version with --version flag", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--version"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output.trim()).toBe(pkg.version);
	});

	it("should show help with --help flag", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--help"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("uncov - Report files with low test coverage");
		expect(output).toContain("--threshold");
		expect(output).toContain("--fail");
	});

	it("should run report command with coverage file", async () => {
		const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--coverage-path", coveragePath], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("Files at or below 10% line coverage:");
	});

	it("should exit 2 when no coverage file found", async () => {
		const proc = Bun.spawn(
			["bun", "run", "./src/cli.ts", "--coverage-path", "/nonexistent/file.json"],
			{
				cwd: PROJECT_ROOT,
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const exitCode = await proc.exited;
		const stderr = await new Response(proc.stderr).text();

		expect(exitCode).toBe(2);
		expect(stderr).toContain("Coverage file not found");
	});

	it("should run init command and modify package.json", async () => {
		// Create a test project
		writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test-project" }));

		const proc = Bun.spawn(["bun", "run", resolve(PROJECT_ROOT, "src/cli.ts"), "init"], {
			cwd: TEST_DIR,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("Detected package manager");
		expect(output).toContain("Added script");
	});

	it("should run check command", async () => {
		// Create test project with partial setup
		writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({ name: "test-project" }));

		const proc = Bun.spawn(["bun", "run", resolve(PROJECT_ROOT, "src/cli.ts"), "check"], {
			cwd: TEST_DIR,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		// Should fail because setup is incomplete
		expect(exitCode).toBe(1);
		expect(output).toContain("check");
		expect(output).toContain("failed");
	});

	it("should reject non-numeric threshold with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--threshold", "abc"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		const stderr = await new Response(proc.stderr).text();
		expect(proc.exitCode).toBe(2);
		expect(stderr).toContain('Invalid threshold value "abc"');
	});

	it("should reject threshold below 0 with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--threshold=-5"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		const stderr = await new Response(proc.stderr).text();
		expect(proc.exitCode).toBe(2);
		expect(stderr).toContain("Threshold must be between 0 and 100");
	});

	it("should reject threshold above 100 with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--threshold", "150"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		const stderr = await new Response(proc.stderr).text();
		expect(proc.exitCode).toBe(2);
		expect(stderr).toContain("Threshold must be between 0 and 100");
	});

	it("should accept valid threshold with coverage file", async () => {
		const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
		const proc = Bun.spawn(
			["bun", "run", "./src/cli.ts", "--threshold", "50", "--coverage-path", coveragePath],
			{
				cwd: PROJECT_ROOT,
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
	});

	it("should reject unrecognized commands with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "foobar"], {
			cwd: PROJECT_ROOT,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const stderr = await new Response(proc.stderr).text();

		expect(exitCode).toBe(2);
		expect(stderr).toContain("Unknown command: foobar");
		expect(stderr).toContain("Run 'uncov --help' for usage information.");
	});

	it("should output JSON with --json flag", async () => {
		const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
		const proc = Bun.spawn(
			["bun", "run", "./src/cli.ts", "--json", "--coverage-path", coveragePath],
			{
				cwd: PROJECT_ROOT,
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		const parsed = JSON.parse(output);
		expect(parsed).toHaveProperty("threshold");
		expect(parsed).toHaveProperty("files");
	});

	it("should exit 1 with --fail when files below threshold", async () => {
		const coveragePath = join(FIXTURES_DIR, "coverage-summary.json");
		const proc = Bun.spawn(
			["bun", "run", "./src/cli.ts", "--fail", "--coverage-path", coveragePath],
			{
				cwd: PROJECT_ROOT,
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const exitCode = await proc.exited;

		expect(exitCode).toBe(1);
	});
});
