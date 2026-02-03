/**
 * Init command - Bootstrap coverage configuration in current project
 */

import { detectGitignore, detectPackageManager, detectVitestConfig } from "../lib/detect";
import { addScripts, readPackageJson } from "../lib/package-json";
import { createVitestConfig, hasVitestConfig } from "../lib/vitest-config";
import { createColors } from "../utils/colors";
import { appendLine, fileExists, resolvePath, writeText } from "../utils/fs";
import { createLogger } from "../utils/logger";

export interface InitOptions {
	force?: boolean;
	noColor?: boolean;
	verbose?: boolean;
	dryRun?: boolean;
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
	const colors = createColors(options.noColor);
	const log = createLogger(options.verbose ?? false);
	const dryRun = options.dryRun ?? false;
	const cwd = process.cwd();

	if (dryRun) {
		console.log(colors.cyan("Dry run - no files will be modified"));
		console.log("");
	}

	log.verbose(`Working directory: ${cwd}`);

	// Check for package.json first
	const packageJsonPath = resolvePath("package.json", cwd);
	log.verbose(`Checking for package.json at: ${packageJsonPath}`);

	if (!fileExists(packageJsonPath)) {
		console.error(colors.red("Error: No package.json found in current directory."));
		console.error("Run 'npm init' or 'pnpm init' first to create a package.json.");
		return 2;
	}

	// Validate package.json is readable
	try {
		readPackageJson(packageJsonPath);
		log.verbose("package.json is valid JSON");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(colors.red(`Error: Failed to read package.json: ${message}`));
		return 2;
	}

	// Step 1: Detect package manager
	log.verbose("Detecting package manager from lockfiles...");
	const packageManager = detectPackageManager(cwd);

	if (dryRun) {
		console.log(`Would detect package manager: ${colors.bold(packageManager)}`);
	} else {
		console.log(`${colors.green("[ok]")} Detected package manager: ${packageManager}`);
	}

	// Step 2: Add scripts to package.json
	log.verbose("Checking package.json scripts...");

	if (dryRun) {
		// In dry-run mode, just show what would happen
		for (const script of Object.keys(SCRIPTS_TO_ADD)) {
			console.log(`Would add script: ${colors.bold(script)}`);
		}
	} else {
		const scriptsResult = addScripts(SCRIPTS_TO_ADD, packageJsonPath);

		for (const script of scriptsResult.added) {
			console.log(`${colors.green("[ok]")} Added script: ${script}`);
		}

		for (const script of scriptsResult.skipped) {
			console.log(`${colors.yellow("[skip]")} Script already exists: ${script}`);
		}
	}

	// Step 3: Handle vitest config
	log.verbose("Checking for existing vitest config...");
	const existingConfig = detectVitestConfig(cwd);
	const vitestConfigPath = resolvePath("vitest.config.ts", cwd);

	if (dryRun) {
		if (existingConfig && !options.force) {
			console.log(`Would skip vitest config (already exists: ${existingConfig.path})`);
		} else if (existingConfig && options.force) {
			console.log(`Would overwrite: ${colors.bold("vitest.config.ts")}`);
		} else if (!hasVitestConfig(cwd)) {
			console.log(`Would create: ${colors.bold("vitest.config.ts")}`);
		}
	} else {
		if (existingConfig && !options.force) {
			console.log(
				`${colors.yellow("[skip]")} Vitest config already exists: ${existingConfig.path}`,
			);
			console.log("       Use --force to overwrite");
		} else {
			if (existingConfig && options.force) {
				// Overwrite existing config
				const configContent = createVitestConfig();
				writeText(vitestConfigPath, configContent);
				console.log(`${colors.green("[ok]")} Overwrote vitest.config.ts with coverage settings`);
			} else if (!hasVitestConfig(cwd)) {
				// Create new config
				const configContent = createVitestConfig();
				writeText(vitestConfigPath, configContent);
				console.log(`${colors.green("[ok]")} Created vitest.config.ts with coverage settings`);
			}
		}
	}

	// Step 4: Update .gitignore
	log.verbose("Checking .gitignore...");
	const gitignoreResult = detectGitignore(cwd);
	const gitignorePath = resolvePath(".gitignore", cwd);

	if (dryRun) {
		if (gitignoreResult.hasCoverage) {
			console.log("Would skip .gitignore (coverage/ already present)");
		} else if (gitignoreResult.exists) {
			console.log(`Would append to .gitignore: ${colors.bold("coverage/")}`);
		} else {
			console.log(`Would create .gitignore with: ${colors.bold("coverage/")}`);
		}
	} else {
		if (gitignoreResult.hasCoverage) {
			console.log(`${colors.yellow("[skip]")} coverage/ already in .gitignore`);
		} else {
			appendLine(gitignorePath, "coverage/");
			if (gitignoreResult.exists) {
				console.log(`${colors.green("[ok]")} Added coverage/ to .gitignore`);
			} else {
				console.log(`${colors.green("[ok]")} Created .gitignore with coverage/`);
			}
		}
	}

	// Final instructions
	console.log("");

	if (dryRun) {
		console.log(colors.cyan("Run without --dry-run to apply these changes."));
	} else {
		console.log(
			`Run '${packageManager} test:coverage' to generate coverage, then 'uncov' to see low coverage files.`,
		);
	}

	return 0;
}
