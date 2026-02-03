/**
 * Unit tests for vitest configuration utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createVitestConfig,
	hasCoverageConfig,
	hasVitestConfig,
} from "../../src/lib/vitest-config";

describe("vitest-config utilities", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `uncov-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("hasVitestConfig", () => {
		it("should return false when no config exists", () => {
			const result = hasVitestConfig(testDir);
			expect(result).toBe(false);
		});

		it("should detect vitest.config.ts", () => {
			writeFileSync(join(testDir, "vitest.config.ts"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vitest.config.js", () => {
			writeFileSync(join(testDir, "vitest.config.js"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vitest.config.mts", () => {
			writeFileSync(join(testDir, "vitest.config.mts"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vitest.config.mjs", () => {
			writeFileSync(join(testDir, "vitest.config.mjs"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vite.config.ts", () => {
			writeFileSync(join(testDir, "vite.config.ts"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vite.config.js", () => {
			writeFileSync(join(testDir, "vite.config.js"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vite.config.mts", () => {
			writeFileSync(join(testDir, "vite.config.mts"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});

		it("should detect vite.config.mjs", () => {
			writeFileSync(join(testDir, "vite.config.mjs"), "export default {}");

			const result = hasVitestConfig(testDir);
			expect(result).toBe(true);
		});
	});

	describe("hasCoverageConfig", () => {
		it("should return false for non-existent file", () => {
			const result = hasCoverageConfig(join(testDir, "vitest.config.ts"));
			expect(result).toBe(false);
		});

		it("should return false for config without coverage", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
`,
			);

			const result = hasCoverageConfig(configPath);
			expect(result).toBe(false);
		});

		it("should detect coverage: {} pattern", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
    },
  },
});
`,
			);

			const result = hasCoverageConfig(configPath);
			expect(result).toBe(true);
		});

		it("should detect coverage : {} pattern with space", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage : {
      provider: 'v8',
    },
  },
});
`,
			);

			const result = hasCoverageConfig(configPath);
			expect(result).toBe(true);
		});

		it("should detect coverage in vite.config.ts", () => {
			const configPath = join(testDir, "vite.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text'],
    },
  },
});
`,
			);

			const result = hasCoverageConfig(configPath);
			expect(result).toBe(true);
		});

		it("should detect coverage assigned to variable", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vitest/config';
import coverageOptions from './coverage.config';

export default defineConfig({
  test: {
    coverage: coverageOptions,
  },
});
`,
			);

			// This should match because coverage: property is assigned to a variable
			const result = hasCoverageConfig(configPath);
			expect(result).toBe(true);
		});

		it("should not detect coverage mentioned only in import path", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(
				configPath,
				`import { defineConfig } from 'vitest/config';
import something from './coverage.config';

export default defineConfig({
  test: {
    globals: true,
  },
});
`,
			);

			// This should NOT match - coverage is only in the import path
			const result = hasCoverageConfig(configPath);
			expect(result).toBe(false);
		});

		it("should handle empty config file", () => {
			const configPath = join(testDir, "vitest.config.ts");
			writeFileSync(configPath, "");

			const result = hasCoverageConfig(configPath);
			expect(result).toBe(false);
		});
	});

	describe("createVitestConfig", () => {
		it("should generate valid vitest config", () => {
			const config = createVitestConfig();

			expect(config).toContain("import { defineConfig } from 'vitest/config'");
			expect(config).toContain("export default defineConfig");
		});

		it("should include test block", () => {
			const config = createVitestConfig();

			expect(config).toContain("test:");
		});

		it("should include coverage configuration", () => {
			const config = createVitestConfig();

			expect(config).toContain("coverage:");
			expect(config).toContain("provider: 'v8'");
		});

		it("should include json-summary reporter", () => {
			const config = createVitestConfig();

			expect(config).toContain("'json-summary'");
		});

		it("should include text reporter", () => {
			const config = createVitestConfig();

			expect(config).toContain("'text'");
		});

		it("should set reportsDirectory to ./coverage", () => {
			const config = createVitestConfig();

			expect(config).toContain("reportsDirectory: './coverage'");
		});

		it("should end with newline", () => {
			const config = createVitestConfig();

			expect(config.endsWith("\n")).toBe(true);
		});

		it("should be syntactically valid (parseable)", () => {
			const config = createVitestConfig();

			// Basic syntax validation - should have balanced braces
			const openBraces = (config.match(/{/g) || []).length;
			const closeBraces = (config.match(/}/g) || []).length;
			expect(openBraces).toBe(closeBraces);

			const openParens = (config.match(/\(/g) || []).length;
			const closeParens = (config.match(/\)/g) || []).length;
			expect(openParens).toBe(closeParens);
		});
	});
});
