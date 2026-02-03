#!/usr/bin/env bun
/**
 * Cross-platform build script for uncov
 * Builds binaries for: darwin-arm64, darwin-x64, linux-x64, windows-x64
 * Generates SHA256 checksums for each binary
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

type Target = "bun-darwin-arm64" | "bun-darwin-x64" | "bun-linux-x64" | "bun-windows-x64";

interface BuildTarget {
	target: Target;
	outfile: string;
}

interface BuildResult {
	target: Target;
	outfile: string;
	success: boolean;
	error?: string;
}

const TARGETS: BuildTarget[] = [
	{ target: "bun-darwin-arm64", outfile: "uncov-darwin-arm64" },
	{ target: "bun-darwin-x64", outfile: "uncov-darwin-x64" },
	{ target: "bun-linux-x64", outfile: "uncov-linux-x64" },
	{ target: "bun-windows-x64", outfile: "uncov-windows-x64.exe" },
];

const DIST_DIR = resolve(import.meta.dir, "..", "dist");

/**
 * Clean the dist directory
 */
function cleanDist(): void {
	if (existsSync(DIST_DIR)) {
		console.log("Cleaning dist/ directory...");
		rmSync(DIST_DIR, { recursive: true, force: true });
	}
}

/**
 * Generate SHA256 checksum for a file
 */
function generateChecksum(filePath: string): string {
	const content = readFileSync(filePath);
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Write checksum file
 */
function writeChecksumFile(binaryPath: string, checksum: string): void {
	const checksumPath = `${binaryPath}.sha256`;
	const filename = binaryPath.split("/").pop() ?? binaryPath;
	writeFileSync(checksumPath, `${checksum}  ${filename}\n`, "utf-8");
}

/**
 * Build a single target
 */
async function buildTarget(target: Target, outfile: string): Promise<BuildResult> {
	const outPath = `${DIST_DIR}/${outfile}`;

	const proc = Bun.spawn(
		["bun", "build", "--compile", "--target", target, "--outfile", outPath, "./src/cli.ts"],
		{
			stdout: "pipe",
			stderr: "pipe",
		},
	);

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		return {
			target,
			outfile,
			success: false,
			error: stderr.trim() || `Exit code ${exitCode}`,
		};
	}

	// Verify binary was created
	if (!existsSync(outPath)) {
		return {
			target,
			outfile,
			success: false,
			error: "Binary file was not created despite successful build",
		};
	}

	// Generate checksum
	const checksum = generateChecksum(outPath);
	writeChecksumFile(outPath, checksum);

	return { target, outfile, success: true };
}

async function build(): Promise<void> {
	console.log("Building uncov for all platforms...\n");

	// Step 1: Clean dist directory
	cleanDist();

	// Step 2: Create dist directory
	await mkdir(DIST_DIR, { recursive: true });

	// Step 3: Build all targets
	const results: BuildResult[] = [];

	for (const { target, outfile } of TARGETS) {
		process.stdout.write(`Building ${target}... `);

		const result = await buildTarget(target, outfile);
		results.push(result);

		if (result.success) {
			console.log("OK");
			console.log(`  -> ${DIST_DIR}/${outfile}`);
			console.log(`  -> ${DIST_DIR}/${outfile}.sha256`);
		} else {
			console.log("FAILED");
			console.log(`  Error: ${result.error}`);
		}
	}

	// Step 4: Summary
	console.log("\n--- Build Summary ---");
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	console.log(`Successful: ${successful.length}/${results.length}`);

	if (failed.length > 0) {
		console.log(`Failed: ${failed.length}`);
		for (const f of failed) {
			console.log(`  - ${f.target}`);
		}
		process.exit(1);
	}

	console.log("\nBuild complete!");
	console.log(`\nOutput directory: ${DIST_DIR}`);
}

build().catch((error) => {
	console.error("Build failed:", error);
	process.exit(1);
});
