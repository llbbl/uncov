/**
 * Unit tests for package.json manipulation utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	addScripts,
	hasScript,
	readPackageJson,
	writePackageJson,
} from "../../src/lib/package-json";

describe("package-json utilities", () => {
	let testDir: string;
	let packagePath: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `uncov-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(testDir, { recursive: true });
		packagePath = join(testDir, "package.json");
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("readPackageJson", () => {
		it("should throw when file does not exist", () => {
			expect(() => readPackageJson(packagePath)).toThrow("package.json not found");
		});

		it("should read valid package.json", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					version: "1.0.0",
				}),
			);

			const pkg = readPackageJson(packagePath);
			expect(pkg.name).toBe("test-pkg");
			expect(pkg.version).toBe("1.0.0");
		});

		it("should read package.json with scripts", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: {
						test: "bun test",
						build: "bun build",
					},
				}),
			);

			const pkg = readPackageJson(packagePath);
			expect(pkg.scripts?.test).toBe("bun test");
			expect(pkg.scripts?.build).toBe("bun build");
		});

		it("should throw for invalid JSON", () => {
			writeFileSync(packagePath, "not valid json");

			expect(() => readPackageJson(packagePath)).toThrow("Failed to parse JSON");
		});

		it("should read package.json with uncov field", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 20 },
				}),
			);

			const pkg = readPackageJson(packagePath);
			expect(pkg.uncov).toEqual({ threshold: 20 });
		});
	});

	describe("writePackageJson", () => {
		it("should write package.json with 2-space indent", () => {
			const pkg = { name: "test-pkg", version: "1.0.0" };

			writePackageJson(pkg, packagePath);

			const content = readFileSync(packagePath, "utf-8");
			expect(content).toContain('  "name"');
			expect(content).toContain('  "version"');
		});

		it("should write with trailing newline", () => {
			const pkg = { name: "test-pkg" };

			writePackageJson(pkg, packagePath);

			const content = readFileSync(packagePath, "utf-8");
			expect(content.endsWith("\n")).toBe(true);
		});

		it("should preserve all fields", () => {
			const pkg = {
				name: "test-pkg",
				version: "1.0.0",
				scripts: { test: "bun test" },
				dependencies: { lodash: "^4.0.0" },
				customField: "value",
			};

			writePackageJson(pkg, packagePath);

			const result = readPackageJson(packagePath);
			expect(result.name).toBe("test-pkg");
			expect(result.scripts?.test).toBe("bun test");
			expect(result.dependencies?.lodash).toBe("^4.0.0");
			expect(result.customField).toBe("value");
		});

		it("should overwrite existing file", () => {
			writeFileSync(packagePath, JSON.stringify({ name: "old" }));

			writePackageJson({ name: "new" }, packagePath);

			const result = readPackageJson(packagePath);
			expect(result.name).toBe("new");
		});
	});

	describe("addScripts", () => {
		it("should add new scripts", () => {
			writeFileSync(packagePath, JSON.stringify({ name: "test-pkg" }));

			const result = addScripts({ "test:coverage": "vitest --coverage" }, packagePath);

			expect(result.added).toEqual(["test:coverage"]);
			expect(result.skipped).toEqual([]);

			const pkg = readPackageJson(packagePath);
			expect(pkg.scripts?.["test:coverage"]).toBe("vitest --coverage");
		});

		it("should skip existing scripts", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: { test: "existing" },
				}),
			);

			const result = addScripts({ test: "new value" }, packagePath);

			expect(result.added).toEqual([]);
			expect(result.skipped).toEqual(["test"]);

			const pkg = readPackageJson(packagePath);
			expect(pkg.scripts?.test).toBe("existing");
		});

		it("should add multiple scripts", () => {
			writeFileSync(packagePath, JSON.stringify({ name: "test-pkg" }));

			const result = addScripts(
				{
					"test:coverage": "vitest --coverage",
					"coverage:low": "uncov",
				},
				packagePath,
			);

			expect(result.added).toEqual(["test:coverage", "coverage:low"]);
			expect(result.skipped).toEqual([]);
		});

		it("should handle mixed add and skip", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: { existing: "value" },
				}),
			);

			const result = addScripts(
				{
					existing: "new",
					new: "value",
				},
				packagePath,
			);

			expect(result.added).toEqual(["new"]);
			expect(result.skipped).toEqual(["existing"]);
		});

		it("should create scripts object if missing", () => {
			writeFileSync(packagePath, JSON.stringify({ name: "test-pkg" }));

			addScripts({ test: "bun test" }, packagePath);

			const pkg = readPackageJson(packagePath);
			expect(pkg.scripts).toBeDefined();
			expect(pkg.scripts?.test).toBe("bun test");
		});

		it("should not write if nothing added", () => {
			const originalContent = JSON.stringify({
				name: "test-pkg",
				scripts: { test: "existing" },
			});
			writeFileSync(packagePath, originalContent);

			addScripts({ test: "new" }, packagePath);

			// File should not have changed (no write, so no formatting)
			const content = readFileSync(packagePath, "utf-8");
			expect(content).toBe(originalContent);
		});

		it("should throw if package.json does not exist", () => {
			expect(() => addScripts({ test: "bun test" }, packagePath)).toThrow("package.json not found");
		});
	});

	describe("hasScript", () => {
		it("should return false when package.json does not exist", () => {
			const result = hasScript("test", packagePath);
			expect(result).toBe(false);
		});

		it("should return false when scripts object does not exist", () => {
			writeFileSync(packagePath, JSON.stringify({ name: "test-pkg" }));

			const result = hasScript("test", packagePath);
			expect(result).toBe(false);
		});

		it("should return false when script does not exist", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: { build: "bun build" },
				}),
			);

			const result = hasScript("test", packagePath);
			expect(result).toBe(false);
		});

		it("should return true when script exists", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: { test: "bun test" },
				}),
			);

			const result = hasScript("test", packagePath);
			expect(result).toBe(true);
		});

		it("should return true for empty script", () => {
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					scripts: { test: "" },
				}),
			);

			const result = hasScript("test", packagePath);
			expect(result).toBe(true);
		});

		it("should handle invalid JSON gracefully", () => {
			writeFileSync(packagePath, "not valid json");

			const result = hasScript("test", packagePath);
			expect(result).toBe(false);
		});
	});
});
