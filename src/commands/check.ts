/**
 * Check command - Verify coverage setup is correct
 */

import { DEFAULT_COVERAGE_PATH } from "../lib/constants";
import { detectVitestConfig, fileExists } from "../lib/detect";
import { hasScript } from "../lib/package-json";
import { hasCoverageConfig } from "../lib/vitest-config";
import { resolvePath } from "../utils/fs";

/**
 * Check result for a single item
 */
interface CheckResult {
	name: string;
	passed: boolean;
	message: string;
	hint?: string;
}

/**
 * Check command - verifies coverage setup is correct
 *
 * Checks performed:
 * 1. Vitest config exists
 * 2. Coverage config detected in vitest config
 * 3. coverage-summary.json exists
 * 4. Scripts are configured in package.json
 *
 * Exit codes:
 * - 0: All checks pass
 * - 1: One or more checks failed
 */
export async function checkCommand(): Promise<number> {
	const cwd = process.cwd();
	const checks: CheckResult[] = [];

	// Check 1: Vitest config exists
	const vitestConfig = detectVitestConfig(cwd);
	if (vitestConfig) {
		checks.push({
			name: "vitest-config",
			passed: true,
			message: `Vitest config found: ${vitestConfig.path}`,
		});

		// Check 2: Coverage config exists (only if vitest config found)
		const hasCoverage = hasCoverageConfig(vitestConfig.path);
		if (hasCoverage) {
			checks.push({
				name: "coverage-config",
				passed: true,
				message: "Coverage config detected",
			});
		} else {
			checks.push({
				name: "coverage-config",
				passed: false,
				message: "Coverage config not found in vitest config",
				hint: "Add coverage configuration to your vitest.config.ts",
			});
		}
	} else {
		checks.push({
			name: "vitest-config",
			passed: false,
			message: "Vitest config not found",
			hint: "Run 'uncov init' to create a vitest.config.ts",
		});

		// Skip coverage config check if no vitest config
		checks.push({
			name: "coverage-config",
			passed: false,
			message: "Coverage config not checked (no vitest config)",
			hint: "Create a vitest config first",
		});
	}

	// Check 3: coverage-summary.json exists
	const coveragePath = resolvePath(DEFAULT_COVERAGE_PATH, cwd);
	if (fileExists(coveragePath)) {
		checks.push({
			name: "coverage-summary",
			passed: true,
			message: `Coverage summary exists: ${DEFAULT_COVERAGE_PATH}`,
		});
	} else {
		checks.push({
			name: "coverage-summary",
			passed: false,
			message: `Coverage summary not found: ${DEFAULT_COVERAGE_PATH}`,
			hint: "Run 'pnpm test:coverage' to generate coverage data",
		});
	}

	// Check 4: Scripts configured
	const hasTestCoverage = hasScript("test:coverage");
	if (hasTestCoverage) {
		checks.push({
			name: "scripts",
			passed: true,
			message: "Scripts configured: test:coverage",
		});
	} else {
		checks.push({
			name: "scripts",
			passed: false,
			message: "Script not found: test:coverage",
			hint: "Run 'uncov init' to add required scripts",
		});
	}

	// Output results
	const failedChecks = checks.filter((c) => !c.passed);
	const passedChecks = checks.filter((c) => c.passed);

	for (const check of passedChecks) {
		console.log(`[ok] ${check.message}`);
	}

	for (const check of failedChecks) {
		console.log(`[fail] ${check.message}`);
		if (check.hint) {
			console.log(`  ${check.hint}`);
		}
	}

	// Summary
	console.log("");
	if (failedChecks.length === 0) {
		console.log("All checks passed!");
		return 0;
	}

	console.log(`${failedChecks.length} check${failedChecks.length === 1 ? "" : "s"} failed`);
	return 1;
}
