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

const HELP = `
uncov - Report files with low test coverage

Usage:
  uncov [options]              Report files below coverage threshold
  uncov init [options]         Bootstrap coverage configuration
  uncov check                  Verify coverage setup

Options:
  -h, --help                   Show this help message
  -v, --version                Show version number

Report Options:
  -t, --threshold <number>     Coverage threshold percentage (default: 10)
  -f, --fail                   Exit with code 1 if files below threshold
  -j, --json                   Output as JSON
  -c, --coverage-path <path>   Path to coverage-summary.json

Init Options:
  --force                      Overwrite existing configuration

Examples:
  uncov                        Show files with <=10% coverage
  uncov --threshold 50         Show files with <=50% coverage
  uncov --fail --threshold 80  Fail CI if files below 80%
  uncov init                   Set up coverage in current project
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
				default: "coverage/coverage-summary.json",
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
		coveragePath: values["coverage-path"] ?? "coverage/coverage-summary.json",
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
