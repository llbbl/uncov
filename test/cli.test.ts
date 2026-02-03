/**
 * CLI integration tests
 */

import { describe, expect, it } from "bun:test";
import pkg from "../package.json" with { type: "json" };

describe("CLI", () => {
	it("should show version with --version flag", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--version"], {
			cwd: `${import.meta.dir}/..`,
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
			cwd: `${import.meta.dir}/..`,
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

	it("should run report command by default", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts"], {
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("Report command not yet implemented");
	});

	it("should run init command", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "init"], {
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("Init command not yet implemented");
	});

	it("should run check command", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "check"], {
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const output = await new Response(proc.stdout).text();

		expect(exitCode).toBe(0);
		expect(output).toContain("Check command not yet implemented");
	});

	it("should reject non-numeric threshold with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--threshold", "abc"], {
			cwd: `${import.meta.dir}/..`,
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
			cwd: `${import.meta.dir}/..`,
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
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});
		await proc.exited;
		const stderr = await new Response(proc.stderr).text();
		expect(proc.exitCode).toBe(2);
		expect(stderr).toContain("Threshold must be between 0 and 100");
	});

	it("should accept valid threshold values", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--threshold", "50"], {
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;

		// Should exit with code 0 (success)
		expect(exitCode).toBe(0);
	});

	it("should reject unrecognized commands with exit code 2", async () => {
		const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "foobar"], {
			cwd: `${import.meta.dir}/..`,
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		const stderr = await new Response(proc.stderr).text();

		expect(exitCode).toBe(2);
		expect(stderr).toContain("Unknown command: foobar");
		expect(stderr).toContain("Run 'uncov --help' for usage information.");
	});
});
