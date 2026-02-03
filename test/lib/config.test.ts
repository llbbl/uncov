/**
 * Unit tests for configuration management
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	DEFAULT_CONFIG,
	findConfigFile,
	loadConfig,
	mergeConfigs,
	readPackageJsonConfig,
} from "../../src/lib/config";

describe("config utilities", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `uncov-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("DEFAULT_CONFIG", () => {
		it("should have correct default values", () => {
			expect(DEFAULT_CONFIG.threshold).toBe(10);
			expect(DEFAULT_CONFIG.exclude).toEqual([]);
			expect(DEFAULT_CONFIG.failOnLow).toBe(false);
			expect(DEFAULT_CONFIG.coveragePath).toBe("coverage/coverage-summary.json");
		});
	});

	describe("findConfigFile", () => {
		it("should return null when no config file exists", () => {
			const result = findConfigFile(testDir);
			expect(result).toBeNull();
		});

		it("should return path when uncov.config.json exists", () => {
			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, JSON.stringify({ threshold: 20 }));

			const result = findConfigFile(testDir);
			expect(result).toBe(configPath);
		});
	});

	describe("readPackageJsonConfig", () => {
		it("should return null when no package.json exists", () => {
			const result = readPackageJsonConfig(testDir);
			expect(result).toBeNull();
		});

		it("should return null when package.json has no uncov field", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(packagePath, JSON.stringify({ name: "test-pkg" }));

			const result = readPackageJsonConfig(testDir);
			expect(result).toBeNull();
		});

		it("should return config from package.json uncov field", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 25, failOnLow: true },
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({ threshold: 25, failOnLow: true });
		});

		it("should validate config types", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: {
						threshold: "invalid", // should be number
						failOnLow: "yes", // should be boolean
						exclude: [1, 2, 3], // should be string array
					},
				}),
			);

			const result = readPackageJsonConfig(testDir);
			// All invalid fields should be excluded
			expect(result).toEqual({});
		});

		it("should reject threshold below 0", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: -10 },
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({});
		});

		it("should reject threshold above 100", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 150 },
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({});
		});

		it("should accept threshold at 0", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 0 },
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({ threshold: 0 });
		});

		it("should accept threshold at 100", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 100 },
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({ threshold: 100 });
		});

		it("should extract only valid fields", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: {
						threshold: 50,
						invalidField: "ignored",
						exclude: ["*.test.ts"],
					},
				}),
			);

			const result = readPackageJsonConfig(testDir);
			expect(result).toEqual({ threshold: 50, exclude: ["*.test.ts"] });
		});
	});

	describe("mergeConfigs", () => {
		it("should return defaults when no configs provided", () => {
			const result = mergeConfigs();
			expect(result).toEqual(DEFAULT_CONFIG);
		});

		it("should override defaults with single config", () => {
			const result = mergeConfigs({ threshold: 50 });
			expect(result.threshold).toBe(50);
			expect(result.exclude).toEqual([]);
			expect(result.failOnLow).toBe(false);
		});

		it("should merge multiple configs with later ones taking precedence", () => {
			const result = mergeConfigs(
				{ threshold: 20 },
				{ threshold: 30, failOnLow: true },
				{ failOnLow: false },
			);

			expect(result.threshold).toBe(30);
			expect(result.failOnLow).toBe(false);
		});

		it("should not override with undefined values", () => {
			const result = mergeConfigs({ threshold: 50 }, { exclude: ["*.test.ts"] });

			expect(result.threshold).toBe(50);
			expect(result.exclude).toEqual(["*.test.ts"]);
		});

		it("should handle coveragePath", () => {
			const result = mergeConfigs({ coveragePath: "custom/path.json" });
			expect(result.coveragePath).toBe("custom/path.json");
		});
	});

	describe("loadConfig", () => {
		it("should return defaults when no config sources exist", () => {
			const result = loadConfig(undefined, testDir);
			expect(result).toEqual(DEFAULT_CONFIG);
		});

		it("should load from package.json", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 25 },
				}),
			);

			const result = loadConfig(undefined, testDir);
			expect(result.threshold).toBe(25);
		});

		it("should load from uncov.config.json", () => {
			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, JSON.stringify({ threshold: 30 }));

			const result = loadConfig(undefined, testDir);
			expect(result.threshold).toBe(30);
		});

		it("should prioritize uncov.config.json over package.json", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 25 },
				}),
			);

			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, JSON.stringify({ threshold: 30 }));

			const result = loadConfig(undefined, testDir);
			expect(result.threshold).toBe(30);
		});

		it("should prioritize CLI overrides over all", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { threshold: 25 },
				}),
			);

			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, JSON.stringify({ threshold: 30 }));

			const result = loadConfig({ threshold: 50 }, testDir);
			expect(result.threshold).toBe(50);
		});

		it("should merge configs from all sources", () => {
			const packagePath = join(testDir, "package.json");
			writeFileSync(
				packagePath,
				JSON.stringify({
					name: "test-pkg",
					uncov: { exclude: ["*.test.ts"] },
				}),
			);

			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, JSON.stringify({ threshold: 30 }));

			const result = loadConfig({ failOnLow: true }, testDir);
			expect(result.threshold).toBe(30);
			expect(result.exclude).toEqual(["*.test.ts"]);
			expect(result.failOnLow).toBe(true);
		});

		it("should handle invalid config file gracefully", () => {
			const configPath = join(testDir, "uncov.config.json");
			writeFileSync(configPath, "not valid json");

			const result = loadConfig(undefined, testDir);
			expect(result).toEqual(DEFAULT_CONFIG);
		});
	});
});
