#!/usr/bin/env bun
/**
 * uncov - Report files with low test coverage from Vitest/Istanbul output
 */

import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { checkCommand } from "./commands/check";
import { initCommand } from "./commands/init";
import { reportCommand } from "./commands/report";

const VERSION = pkg.version;
export const DEFAULT_COVERAGE_PATH = "coverage/coverage-summary.json";

const HELP = `
uncov - Report files with low test coverage

Usage: uncov [command] [options]

Commands:
  (default)  Report files below coverage threshold
  init       Bootstrap coverage configuration
  check      Verify coverage setup

Options:
  --threshold <n>  Coverage threshold percentage (default: 10)
  --fail           Exit 1 if files below threshold
  --json           Output as JSON
  --help, -h       Show this help
  --version, -v    Show version
`.trim();

interface ParsedArgs {
	command: "report" | "init" | "check";
	help: boolean;
	version: boolean;
	threshold: number;
	fail: boolean;
	json: boolean;
	coveragePath: string;
	force: boolean;
}

function parseCliArgs(args: string[]): ParsedArgs {
	const { values, positionals } = parseArgs({
		args,
		options: {
			help: { type: "boolean", short: "h", default: false },
			version: { type: "boolean", short: "v", default: false },
			threshold: { type: "string", short: "t", default: "10" },
			fail: { type: "boolean", short: "f", default: false },
			json: { type: "boolean", short: "j", default: false },
			"coverage-path": {
				type: "string",
				short: "c",
				default: DEFAULT_COVERAGE_PATH,
			},
			force: { type: "boolean", default: false },
		},
		allowPositionals: true,
	});

	const command = positionals[0];
	let parsedCommand: "report" | "init" | "check" = "report";

	if (command === "init") {
		parsedCommand = "init";
	} else if (command === "check") {
		parsedCommand = "check";
	} else if (command && command !== "report") {
		console.error(`Unknown command: ${command}`);
		console.error("Run 'uncov --help' for usage information.");
		process.exit(2);
	}

	// Validate threshold argument
	const thresholdRaw = values.threshold ?? "10";
	const threshold = Number.parseInt(thresholdRaw, 10);

	if (Number.isNaN(threshold)) {
		console.error(`Error: Invalid threshold value "${thresholdRaw}". Must be a number.`);
		process.exit(2);
	}

	if (threshold < 0 || threshold > 100) {
		console.error(`Error: Threshold must be between 0 and 100, got ${threshold}.`);
		process.exit(2);
	}

	return {
		command: parsedCommand,
		help: values.help ?? false,
		version: values.version ?? false,
		threshold,
		fail: values.fail ?? false,
		json: values.json ?? false,
		coveragePath: values["coverage-path"] ?? DEFAULT_COVERAGE_PATH,
		force: values.force ?? false,
	};
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));

	if (args.version) {
		console.log(VERSION);
		process.exit(0);
	}

	if (args.help) {
		console.log(HELP);
		process.exit(0);
	}

	let exitCode = 0;

	switch (args.command) {
		case "report":
			exitCode = await reportCommand({
				threshold: args.threshold,
				fail: args.fail,
				json: args.json,
				coveragePath: args.coveragePath,
			});
			break;
		case "init":
			exitCode = await initCommand({
				force: args.force,
			});
			break;
		case "check":
			exitCode = await checkCommand();
			break;
	}

	process.exit(exitCode);
}

main().catch((error) => {
	console.error("Error:", error.message);
	process.exit(2);
});
