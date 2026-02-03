/**
 * Check command - Verify coverage setup is correct
 */

import { DEFAULT_COVERAGE_PATH } from "../lib/constants";
import { detectVitestConfig, fileExists } from "../lib/detect";
import { hasScript } from "../lib/package-json";
import { hasCoverageConfig } from "../lib/vitest-config";
import { createColors } from "../utils/colors";
import { resolvePath } from "../utils/fs";
import { createLogger } from "../utils/logger";

export interface CheckOptions {
	noColor?: boolean;
	verbose?: boolean;
}

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
export async function checkCommand(options: CheckOptions = {}): Promise<number> {
	const colors = createColors(options.noColor);
	const log = createLogger(options.verbose ?? false);
	const cwd = process.cwd();
	const checks: CheckResult[] = [];

	log.verbose(`Working directory: ${cwd}`);

	// Check 1: Vitest config exists
	log.verbose("Checking for vitest config...");
	const vitestConfig = detectVitestConfig(cwd);
	if (vitestConfig) {
		log.verbose(`Found vitest config: ${vitestConfig.path}`);
		checks.push({
			name: "vitest-config",
			passed: true,
			message: `Vitest config found: ${vitestConfig.path}`,
		});

		// Check 2: Coverage config exists (only if vitest config found)
		log.verbose("Checking for coverage config in vitest config...");
		const hasCoverage = hasCoverageConfig(vitestConfig.path);
		if (hasCoverage) {
			log.verbose("Coverage config detected");
			checks.push({
				name: "coverage-config",
				passed: true,
				message: "Coverage config detected",
			});
		} else {
			log.verbose("Coverage config not found");
			checks.push({
				name: "coverage-config",
				passed: false,
				message: "Coverage config not found in vitest config",
				hint: "Add coverage configuration to your vitest.config.ts",
			});
		}
	} else {
		log.verbose("No vitest config found");
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
	log.verbose(`Checking for coverage summary at: ${coveragePath}`);
	if (fileExists(coveragePath)) {
		log.verbose("Coverage summary found");
		checks.push({
			name: "coverage-summary",
			passed: true,
			message: `Coverage summary exists: ${DEFAULT_COVERAGE_PATH}`,
		});
	} else {
		log.verbose("Coverage summary not found");
		checks.push({
			name: "coverage-summary",
			passed: false,
			message: `Coverage summary not found: ${DEFAULT_COVERAGE_PATH}`,
			hint: "Run 'pnpm test:coverage' to generate coverage data",
		});
	}

	// Check 4: Scripts configured
	log.verbose("Checking for test:coverage script in package.json...");
	const hasTestCoverage = hasScript("test:coverage");
	if (hasTestCoverage) {
		log.verbose("test:coverage script found");
		checks.push({
			name: "scripts",
			passed: true,
			message: "Scripts configured: test:coverage",
		});
	} else {
		log.verbose("test:coverage script not found");
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
		console.log(`${colors.green("[ok]")} ${check.message}`);
	}

	for (const check of failedChecks) {
		console.log(`${colors.red("[fail]")} ${check.message}`);
		if (check.hint) {
			console.log(`  ${colors.dim(check.hint)}`);
		}
	}

	// Summary
	console.log("");
	if (failedChecks.length === 0) {
		console.log(colors.green("All checks passed!"));
		return 0;
	}

	console.log(
		colors.red(`${failedChecks.length} check${failedChecks.length === 1 ? "" : "s"} failed`),
	);
	return 1;
}
