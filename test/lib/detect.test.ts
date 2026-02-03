/**
 * Unit tests for detection utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectGitignore, detectPackageManager, detectVitestConfig } from "../../src/lib/detect";

describe("detect utilities", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `uncov-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("detectPackageManager", () => {
		it("should return npm when no lockfile exists", () => {
			const result = detectPackageManager(testDir);
			expect(result).toBe("npm");
		});

		it("should detect pnpm from pnpm-lock.yaml", () => {
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "lockfileVersion: 5.4");

			const result = detectPackageManager(testDir);
			expect(result).toBe("pnpm");
		});

		it("should detect bun from bun.lockb", () => {
			writeFileSync(join(testDir, "bun.lockb"), "binary content");

			const result = detectPackageManager(testDir);
			expect(result).toBe("bun");
		});

		it("should detect npm from package-lock.json", () => {
			writeFileSync(join(testDir, "package-lock.json"), "{}");

			const result = detectPackageManager(testDir);
			expect(result).toBe("npm");
		});

		it("should detect yarn from yarn.lock", () => {
			writeFileSync(join(testDir, "yarn.lock"), "# yarn lockfile");

			const result = detectPackageManager(testDir);
			expect(result).toBe("yarn");
		});

		it("should prioritize pnpm over bun", () => {
			writeFileSync(join(testDir, "pnpm-lock.yaml"), "");
			writeFileSync(join(testDir, "bun.lockb"), "");

			const result = detectPackageManager(testDir);
			expect(result).toBe("pnpm");
		});

		it("should prioritize bun over npm", () => {
			writeFileSync(join(testDir, "bun.lockb"), "");
			writeFileSync(join(testDir, "package-lock.json"), "");

			const result = detectPackageManager(testDir);
			expect(result).toBe("bun");
		});

		it("should prioritize npm over yarn", () => {
			writeFileSync(join(testDir, "package-lock.json"), "");
			writeFileSync(join(testDir, "yarn.lock"), "");

			const result = detectPackageManager(testDir);
			expect(result).toBe("npm");
		});
	});

	describe("detectVitestConfig", () => {
		it("should return null when no config file exists", () => {
			const result = detectVitestConfig(testDir);
			expect(result).toBeNull();
		});

		it("should detect vitest.config.ts", () => {
			writeFileSync(join(testDir, "vitest.config.ts"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vitest.config.ts"));
			expect(result?.type).toBe("ts");
		});

		it("should detect vitest.config.js", () => {
			writeFileSync(join(testDir, "vitest.config.js"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vitest.config.js"));
			expect(result?.type).toBe("js");
		});

		it("should detect vitest.config.mts", () => {
			writeFileSync(join(testDir, "vitest.config.mts"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vitest.config.mts"));
			expect(result?.type).toBe("mts");
		});

		it("should detect vitest.config.mjs", () => {
			writeFileSync(join(testDir, "vitest.config.mjs"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vitest.config.mjs"));
			expect(result?.type).toBe("mjs");
		});

		it("should detect vite.config.ts", () => {
			writeFileSync(join(testDir, "vite.config.ts"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vite.config.ts"));
			expect(result?.type).toBe("ts");
		});

		it("should detect vite.config.js", () => {
			writeFileSync(join(testDir, "vite.config.js"), "export default {}");

			const result = detectVitestConfig(testDir);
			expect(result).not.toBeNull();
			expect(result?.path).toBe(join(testDir, "vite.config.js"));
			expect(result?.type).toBe("js");
		});

		it("should prioritize vitest.config.ts over vite.config.ts", () => {
			writeFileSync(join(testDir, "vitest.config.ts"), "// vitest");
			writeFileSync(join(testDir, "vite.config.ts"), "// vite");

			const result = detectVitestConfig(testDir);
			expect(result?.path).toBe(join(testDir, "vitest.config.ts"));
		});

		it("should prioritize vitest.config.ts over vitest.config.js", () => {
			writeFileSync(join(testDir, "vitest.config.ts"), "// ts");
			writeFileSync(join(testDir, "vitest.config.js"), "// js");

			const result = detectVitestConfig(testDir);
			expect(result?.path).toBe(join(testDir, "vitest.config.ts"));
		});
	});

	describe("detectGitignore", () => {
		it("should return exists: false when no .gitignore", () => {
			const result = detectGitignore(testDir);
			expect(result.exists).toBe(false);
			expect(result.hasCoverage).toBe(false);
		});

		it("should detect .gitignore without coverage", () => {
			writeFileSync(join(testDir, ".gitignore"), "node_modules\n.env");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(false);
		});

		it("should detect coverage in .gitignore", () => {
			writeFileSync(join(testDir, ".gitignore"), "node_modules\ncoverage\n.env");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect coverage/ in .gitignore", () => {
			writeFileSync(join(testDir, ".gitignore"), "coverage/\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect /coverage in .gitignore", () => {
			writeFileSync(join(testDir, ".gitignore"), "/coverage\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect /coverage/ in .gitignore", () => {
			writeFileSync(join(testDir, ".gitignore"), "/coverage/\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should ignore commented coverage lines", () => {
			writeFileSync(join(testDir, ".gitignore"), "# coverage\nnode_modules");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(false);
		});

		it("should handle empty .gitignore", () => {
			writeFileSync(join(testDir, ".gitignore"), "");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(false);
		});

		it("should handle .gitignore with only whitespace", () => {
			writeFileSync(join(testDir, ".gitignore"), "   \n\n   ");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(false);
		});

		it("should handle coverage with extra whitespace", () => {
			writeFileSync(join(testDir, ".gitignore"), "  coverage  \n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect coverage* glob pattern", () => {
			writeFileSync(join(testDir, ".gitignore"), "node_modules\ncoverage*\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect **/coverage glob pattern", () => {
			writeFileSync(join(testDir, ".gitignore"), "**/coverage\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect **/coverage/ glob pattern", () => {
			writeFileSync(join(testDir, ".gitignore"), "**/coverage/\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect path/to/coverage pattern", () => {
			writeFileSync(join(testDir, ".gitignore"), "some/path/to/coverage\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});

		it("should detect path/to/coverage/ pattern with trailing slash", () => {
			writeFileSync(join(testDir, ".gitignore"), "some/path/coverage/\n");

			const result = detectGitignore(testDir);
			expect(result.exists).toBe(true);
			expect(result.hasCoverage).toBe(true);
		});
	});
});
