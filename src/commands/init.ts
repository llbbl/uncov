/**
 * Init command - Bootstrap coverage configuration in current project
 */

import { detectGitignore, detectPackageManager, detectVitestConfig } from "../lib/detect";
import { addScripts, readPackageJson } from "../lib/package-json";
import { createVitestConfig, hasVitestConfig } from "../lib/vitest-config";
import { appendLine, fileExists, resolvePath, writeText } from "../utils/fs";

export interface InitOptions {
	force?: boolean;
}

/**
 * Scripts to add to package.json
 */
const SCRIPTS_TO_ADD = {
	"test:coverage": "vitest run --coverage",
	"coverage:low": "uncov",
};

/**
 * Init command - bootstraps coverage configuration in a project
 *
 * Exit codes:
 * - 0: Success
 * - 2: Error (no package.json, etc.)
 */
export async function initCommand(options: InitOptions): Promise<number> {
	const cwd = process.cwd();

	// Check for package.json first
	const packageJsonPath = resolvePath("package.json", cwd);
	if (!fileExists(packageJsonPath)) {
		console.error("Error: No package.json found in current directory.");
		console.error("Run 'npm init' or 'pnpm init' first to create a package.json.");
		return 2;
	}

	// Validate package.json is readable
	try {
		readPackageJson(packageJsonPath);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(`Error: Failed to read package.json: ${message}`);
		return 2;
	}

	// Step 1: Detect package manager
	const packageManager = detectPackageManager(cwd);
	console.log(`[ok] Detected package manager: ${packageManager}`);

	// Step 2: Add scripts to package.json
	const scriptsResult = addScripts(SCRIPTS_TO_ADD, packageJsonPath);

	for (const script of scriptsResult.added) {
		console.log(`[ok] Added script: ${script}`);
	}

	for (const script of scriptsResult.skipped) {
		console.log(`[skip] Script already exists: ${script}`);
	}

	// Step 3: Handle vitest config
	const existingConfig = detectVitestConfig(cwd);

	if (existingConfig && !options.force) {
		console.log(`[skip] Vitest config already exists: ${existingConfig.path}`);
		console.log("       Use --force to overwrite");
	} else {
		const vitestConfigPath = resolvePath("vitest.config.ts", cwd);

		if (existingConfig && options.force) {
			// Overwrite existing config
			const configContent = createVitestConfig();
			writeText(vitestConfigPath, configContent);
			console.log("[ok] Overwrote vitest.config.ts with coverage settings");
		} else if (!hasVitestConfig(cwd)) {
			// Create new config
			const configContent = createVitestConfig();
			writeText(vitestConfigPath, configContent);
			console.log("[ok] Created vitest.config.ts with coverage settings");
		}
	}

	// Step 4: Update .gitignore
	const gitignoreResult = detectGitignore(cwd);
	const gitignorePath = resolvePath(".gitignore", cwd);

	if (gitignoreResult.hasCoverage) {
		console.log("[skip] coverage/ already in .gitignore");
	} else {
		appendLine(gitignorePath, "coverage/");
		if (gitignoreResult.exists) {
			console.log("[ok] Added coverage/ to .gitignore");
		} else {
			console.log("[ok] Created .gitignore with coverage/");
		}
	}

	// Final instructions
	console.log("");
	console.log(
		`Run '${packageManager} test:coverage' to generate coverage, then 'uncov' to see low coverage files.`,
	);

	return 0;
}
