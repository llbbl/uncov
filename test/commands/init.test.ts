/**
 * Tests for the init command
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initCommand } from "../../src/commands/init";

const TEST_DIR = join(import.meta.dir, "..", ".test-init");

describe("initCommand", () => {
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

	describe("without package.json", () => {
		it("should return exit code 2 when no package.json exists", async () => {
			process.chdir(TEST_DIR);

			const exitCode = await initCommand({ force: false });

			expect(exitCode).toBe(2);

			const errorOutput = consoleErrorSpy.mock.calls.flat().join("\n");
			expect(errorOutput).toContain("No package.json found");
		});
	});

	describe("with package.json", () => {
		beforeEach(() => {
			// Create minimal package.json
			const packageJson = { name: "test-project", version: "1.0.0" };
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify(packageJson, null, 2));
		});

		it("should detect package manager from lockfile", async () => {
			process.chdir(TEST_DIR);

			// Create pnpm lockfile
			writeFileSync(join(TEST_DIR, "pnpm-lock.yaml"), "");

			const exitCode = await initCommand({ force: false });

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: pnpm");
		});

		it("should default to npm when no lockfile found", async () => {
			process.chdir(TEST_DIR);

			const exitCode = await initCommand({ force: false });

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: npm");
		});

		it("should add test:coverage script to package.json", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ force: false });

			const packageJson = JSON.parse(readFileSync(join(TEST_DIR, "package.json"), "utf-8"));
			expect(packageJson.scripts?.["test:coverage"]).toBe("vitest run --coverage");
		});

		it("should add coverage:low script to package.json", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ force: false });

			const packageJson = JSON.parse(readFileSync(join(TEST_DIR, "package.json"), "utf-8"));
			expect(packageJson.scripts?.["coverage:low"]).toBe("uncov");
		});

		it("should skip existing scripts", async () => {
			process.chdir(TEST_DIR);

			// Create package.json with existing script
			const packageJson = {
				name: "test-project",
				scripts: { "test:coverage": "custom command" },
			};
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify(packageJson, null, 2));

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[skip] Script already exists: test:coverage");

			// Verify script was not overwritten
			const updatedPkg = JSON.parse(readFileSync(join(TEST_DIR, "package.json"), "utf-8"));
			expect(updatedPkg.scripts?.["test:coverage"]).toBe("custom command");
		});

		it("should create vitest.config.ts when none exists", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ force: false });

			const configContent = readFileSync(join(TEST_DIR, "vitest.config.ts"), "utf-8");
			expect(configContent).toContain("defineConfig");
			expect(configContent).toContain("coverage");
			expect(configContent).toContain("provider: 'v8'");
		});

		it("should skip vitest config when one exists", async () => {
			process.chdir(TEST_DIR);

			// Create existing vitest config
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[skip] Vitest config already exists");

			// Verify config was not overwritten
			const configContent = readFileSync(join(TEST_DIR, "vitest.config.ts"), "utf-8");
			expect(configContent).toBe("export default {}");
		});

		it("should overwrite vitest config with --force flag", async () => {
			process.chdir(TEST_DIR);

			// Create existing vitest config
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			await initCommand({ force: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[ok] Overwrote vitest.config.ts");

			// Verify config was overwritten
			const configContent = readFileSync(join(TEST_DIR, "vitest.config.ts"), "utf-8");
			expect(configContent).toContain("coverage");
		});

		it("should create .gitignore with coverage/ when none exists", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ force: false });

			const gitignoreContent = readFileSync(join(TEST_DIR, ".gitignore"), "utf-8");
			expect(gitignoreContent).toContain("coverage/");

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Created .gitignore with coverage/");
		});

		it("should add coverage/ to existing .gitignore", async () => {
			process.chdir(TEST_DIR);

			// Create existing .gitignore
			writeFileSync(join(TEST_DIR, ".gitignore"), "node_modules/\n");

			await initCommand({ force: false });

			const gitignoreContent = readFileSync(join(TEST_DIR, ".gitignore"), "utf-8");
			expect(gitignoreContent).toContain("node_modules/");
			expect(gitignoreContent).toContain("coverage/");

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Added coverage/ to .gitignore");
		});

		it("should skip .gitignore when coverage/ already present", async () => {
			process.chdir(TEST_DIR);

			// Create .gitignore with coverage
			writeFileSync(join(TEST_DIR, ".gitignore"), "node_modules/\ncoverage/\n");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("[skip] coverage/ already in .gitignore");
		});

		it("should output final instructions with detected package manager", async () => {
			process.chdir(TEST_DIR);

			// Create bun lockfile
			writeFileSync(join(TEST_DIR, "bun.lockb"), "");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("bun test:coverage");
			expect(output).toContain("uncov");
		});

		it("should return exit code 0 on success", async () => {
			process.chdir(TEST_DIR);

			const exitCode = await initCommand({ force: false });

			expect(exitCode).toBe(0);
		});
	});

	describe("with different package managers", () => {
		beforeEach(() => {
			const packageJson = { name: "test-project", version: "1.0.0" };
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify(packageJson, null, 2));
		});

		it("should detect pnpm from pnpm-lock.yaml", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "pnpm-lock.yaml"), "");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: pnpm");
		});

		it("should detect bun from bun.lockb", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "bun.lockb"), "");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: bun");
		});

		it("should detect npm from package-lock.json", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "package-lock.json"), "{}");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: npm");
		});

		it("should detect yarn from yarn.lock", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "yarn.lock"), "");

			await initCommand({ force: false });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Detected package manager: yarn");
		});
	});

	describe("with --dry-run flag", () => {
		beforeEach(() => {
			const packageJson = { name: "test-project", version: "1.0.0" };
			writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify(packageJson, null, 2));
		});

		it("should show dry run header message", async () => {
			process.chdir(TEST_DIR);

			const exitCode = await initCommand({ dryRun: true });

			expect(exitCode).toBe(0);

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Dry run - no files will be modified");
		});

		it("should show what package manager would be detected", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "pnpm-lock.yaml"), "");

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Would detect package manager:");
			expect(output).toContain("pnpm");
		});

		it("should show what scripts would be added", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Would add script:");
			expect(output).toContain("test:coverage");
			expect(output).toContain("coverage:low");
		});

		it("should show what config would be created", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Would create:");
			expect(output).toContain("vitest.config.ts");
		});

		it("should show what .gitignore changes would be made", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			// Either "Would create .gitignore" or "Would append to .gitignore"
			expect(output.toLowerCase()).toContain("gitignore");
			expect(output).toContain("coverage/");
		});

		it("should not modify package.json in dry-run mode", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const packageJson = JSON.parse(readFileSync(join(TEST_DIR, "package.json"), "utf-8"));
			expect(packageJson.scripts).toBeUndefined();
		});

		it("should not create vitest.config.ts in dry-run mode", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const configExists = existsSync(join(TEST_DIR, "vitest.config.ts"));
			expect(configExists).toBe(false);
		});

		it("should not create .gitignore in dry-run mode", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const gitignoreExists = existsSync(join(TEST_DIR, ".gitignore"));
			expect(gitignoreExists).toBe(false);
		});

		it("should show final instruction to run without --dry-run", async () => {
			process.chdir(TEST_DIR);

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Run without --dry-run to apply these changes");
		});

		it("should show would skip existing vitest config", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			await initCommand({ dryRun: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Would skip vitest config");
		});

		it("should show would overwrite with --force flag", async () => {
			process.chdir(TEST_DIR);
			writeFileSync(join(TEST_DIR, "vitest.config.ts"), "export default {}");

			await initCommand({ dryRun: true, force: true });

			const output = consoleLogSpy.mock.calls.flat().join("\n");
			expect(output).toContain("Would overwrite:");
			expect(output).toContain("vitest.config.ts");
		});
	});
});
