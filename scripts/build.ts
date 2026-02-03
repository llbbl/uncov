#!/usr/bin/env bun
/**
 * Cross-platform build script for uncov
 * Builds binaries for: darwin-arm64, darwin-x64, linux-x64, windows-x64
 */

import { mkdir } from "node:fs/promises";

type Target = "bun-darwin-arm64" | "bun-darwin-x64" | "bun-linux-x64" | "bun-windows-x64";

interface BuildTarget {
	target: Target;
	outfile: string;
}

const TARGETS: BuildTarget[] = [
	{ target: "bun-darwin-arm64", outfile: "uncov-darwin-arm64" },
	{ target: "bun-darwin-x64", outfile: "uncov-darwin-x64" },
	{ target: "bun-linux-x64", outfile: "uncov-linux-x64" },
	{ target: "bun-windows-x64", outfile: "uncov-windows-x64.exe" },
];

async function build(): Promise<void> {
	const distDir = "./dist";

	// Create dist directory
	await mkdir(distDir, { recursive: true });

	console.log("Building uncov for all platforms...\n");

	for (const { target, outfile } of TARGETS) {
		console.log(`Building ${target}...`);

		const proc = Bun.spawn(
			[
				"bun",
				"build",
				"--compile",
				"--target",
				target,
				"--outfile",
				`${distDir}/${outfile}`,
				"./src/cli.ts",
			],
			{
				stdout: "inherit",
				stderr: "inherit",
			},
		);

		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			console.error(`Failed to build ${target}`);
			process.exit(1);
		}

		console.log(`  -> ${distDir}/${outfile}`);
	}

	console.log("\nBuild complete!");
}

build().catch((error) => {
	console.error("Build failed:", error);
	process.exit(1);
});
