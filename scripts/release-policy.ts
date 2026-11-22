type ReleaseBump = "minor" | "patch" | "none";

const bumps = new Map<string, ReleaseBump>([
	["feat", "minor"],
	["fix", "patch"],
	["perf", "patch"],
	["refactor", "patch"],
	["revert", "patch"],
	["chore", "none"],
	["docs", "none"],
	["test", "none"],
	["style", "none"],
	["ci", "none"],
	["build", "none"],
]);

export function classifySubject(subject: string): ReleaseBump {
	const match = /^([a-z]+)(?:\([^()\s!]+\))?(!)?: \S[^\r\n]*$/i.exec(subject);
	if (!match) {
		throw new Error("Expected a Conventional Commit subject such as fix(cli): handle empty input");
	}
	const [, type, breaking] = match;
	if (breaking) {
		throw new Error("Breaking change markers are forbidden");
	}
	const bump = bumps.get(type.toLowerCase());
	if (!bump) {
		throw new Error(`Unsupported commit type: ${type}`);
	}
	return bump;
}

function classifyMessage(message: string): ReleaseBump {
	const [subject, separator = ""] = message.split(/\r?\n/, 2);
	if (/^[ \t]*BREAKING[ -]CHANGE:/m.test(message)) {
		throw new Error("Breaking change footers are forbidden");
	}
	if (separator !== "") {
		throw new Error("Separate the commit subject and body with a blank line");
	}
	return classifySubject(subject);
}

function parseTag(tag: string): [bigint, bigint] {
	const match = /^v0\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
	if (!match) {
		throw new Error("Release tags must use the stable v0.MINOR.PATCH format");
	}
	return [BigInt(match[1]), BigInt(match[2])];
}

export function validatePublishTag(tag: string, packageVersion: string): void {
	parseTag(tag);
	if (tag !== `v${packageVersion}`) {
		throw new Error("Release tag must match the version in package.json");
	}
}

export function nextReleaseTag(
	latestTag: string,
	commits: { sha: string; message: string }[],
): string | undefined {
	const [minor, patch] = parseTag(latestTag);
	let bump: ReleaseBump = "none";
	for (const { sha, message } of commits) {
		try {
			const current = classifyMessage(message);
			if (current === "minor" || bump === "none") {
				bump = current;
			}
		} catch (error) {
			throw new Error(`Commit ${sha}: ${error instanceof Error ? error.message : error}`);
		}
	}
	if (bump === "minor") return `v0.${minor + 1n}.0`;
	if (bump === "patch") return `v0.${minor}.${patch + 1n}`;
}

function git(cwd: string, ...args: string[]): string {
	const result = Bun.spawnSync(["git", ...args], { cwd });
	if (result.exitCode !== 0) {
		throw new Error(result.stderr.toString().trim() || "Git command failed");
	}
	return result.stdout.toString();
}

function determineNextTag(cwd: string): string | undefined {
	const baseline = git(
		cwd,
		"describe",
		"--first-parent",
		"--tags",
		"--abbrev=0",
		"--match=v[0-9]*",
		"--always",
	).trim();
	const hasTag = baseline.startsWith("v");
	const range = hasTag ? `${baseline}..HEAD` : "HEAD";
	const fields = git(cwd, "log", "-z", "--format=%H%x00%B", range, "--").split("\0");
	const commits = [];
	for (let index = 0; index + 1 < fields.length; index += 2) {
		commits.push({ sha: fields[index], message: fields[index + 1] });
	}
	return nextReleaseTag(hasTag ? baseline : "v0.0.0", commits);
}

export function runReleasePolicy(args: string[], cwd = process.cwd()): number {
	const [command, value, packageVersion] = args;
	try {
		if (command === "next") {
			const tag = determineNextTag(cwd);
			if (tag) console.log(tag);
		} else if (command === "title" && value !== undefined) {
			classifySubject(value);
		} else if (command === "publish" && value !== undefined && packageVersion !== undefined) {
			validatePublishTag(value, packageVersion);
		} else {
			throw new Error("Usage: release-policy.ts next | title <title> | publish <tag> <version>");
		}
		return 0;
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		return 1;
	}
}

if (import.meta.main) process.exitCode = runReleasePolicy(process.argv.slice(2));
