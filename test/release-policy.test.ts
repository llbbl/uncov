import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	classifySubject,
	nextReleaseTag,
	runReleasePolicy,
	validatePublishTag,
} from "../scripts/release-policy";

function nextTag(...messages: string[]): string | undefined {
	return nextReleaseTag(
		"v0.1.8",
		messages.map((message, index) => ({ sha: `commit-${index}`, message })),
	);
}

function git(cwd: string, ...args: string[]): string {
	const result = Bun.spawnSync(
		["git", "-c", "user.name=Release Test", "-c", "user.email=test@example.invalid", ...args],
		{ cwd, env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } },
	);
	if (result.exitCode !== 0) throw new Error(result.stderr.toString());
	return result.stdout.toString().trim();
}

describe("release policy", () => {
	test("skips an empty range and maintenance-only commits", () => {
		expect(nextTag()).toBeUndefined();
		const maintenance = ["chore(release)", "docs", "test", "style", "ci", "build"];
		expect(nextTag(...maintenance.map((type) => `${type}: maintenance`))).toBeUndefined();
	});

	test.each(["fix", "perf", "refactor", "revert"])("bumps %s to the next patch", (type) => {
		expect(nextTag(`${type}(cli): update behavior`, "docs: refresh usage")).toBe("v0.1.9");
	});

	test("gives features precedence over patches in either order", () => {
		const feature = "Feat(cli): add a flag";
		const fix = "fix: handle empty input\n\nThe prose can mention BREAKING CHANGE: inline.";
		expect(nextTag(feature, fix)).toBe("v0.2.0");
		expect(nextTag(fix, feature)).toBe("v0.2.0");
	});

	test.each([
		"update coverage",
		"other: update coverage",
		"fix:no space",
		"fix: ",
		"fix(): handle empty input",
	])("rejects malformed subject %j even after a feature", (subject) => {
		expect(() => classifySubject(subject)).toThrow();
		expect(() => nextTag("feat: add a flag", subject)).toThrow("Commit commit-1:");
	});

	test("requires a blank line before the body", () => {
		expect(() => nextTag("fix: handle empty input\nBody starts too soon")).toThrow("blank line");
	});

	test.each(["feat!: new API", "docs(cli)!: new API"])("rejects breaking subject %j", (subject) => {
		expect(() => classifySubject(subject)).toThrow("Breaking change markers");
		expect(() => nextTag(subject)).toThrow("Breaking change markers");
	});

	test.each(["BREAKING CHANGE", "BREAKING-CHANGE"])("rejects the %s footer", (marker) => {
		expect(() =>
			nextTag(`chore(release): refresh\r\n\r\nNotes\r\n\r\n${marker}: removed API`),
		).toThrow("Breaking change footers");
	});

	test.each([
		"v1.0.0",
		"v1.0.0-rc.1",
		"v12.4.0",
		"v0.01.0",
		"v0.2.0-rc.1",
		"v0.2",
	])("refuses to release or publish tag %s", (tag) => {
		expect(() => nextReleaseTag(tag, [])).toThrow("v0.MINOR.PATCH");
		expect(() => validatePublishTag(tag, tag.slice(1))).toThrow("v0.MINOR.PATCH");
	});

	test("requires the publish tag and package version to match", () => {
		expect(() => validatePublishTag("v0.1.8", "0.1.8")).not.toThrow();
		expect(() => validatePublishTag("v0.1.8", "1.0.0")).toThrow("package.json");
	});
});

test("release CLI uses complete messages after the last tag in a local Git history", () => {
	const cwd = mkdtempSync(join(tmpdir(), "uncov-release-"));
	const stdout = spyOn(console, "log").mockImplementation(() => {});
	const stderr = spyOn(console, "error").mockImplementation(() => {});
	const commit = (...args: string[]) => {
		git(cwd, "-c", "commit.gpgSign=false", "commit", "--allow-empty", ...args);
		return git(cwd, "rev-parse", "HEAD");
	};
	const determine = () => {
		stdout.mockClear();
		stderr.mockClear();
		return runReleasePolicy(["next"], cwd);
	};

	try {
		expect(determine()).toBe(1);
		expect(stdout).not.toHaveBeenCalled();
		expect(stderr).toHaveBeenCalledTimes(1);
		git(cwd, "init", "--quiet");
		commit("-m", "feat: initialize project");
		expect(determine()).toBe(0);
		expect(stdout).toHaveBeenCalledWith("v0.1.0");
		commit("-m", "Legacy subject");
		git(cwd, "-c", "tag.gpgSign=false", "tag", "-a", "v0.1.8", "-m", "Release v0.1.8");
		commit("-m", "docs: update usage");
		expect(determine()).toBe(0);
		expect(stdout).not.toHaveBeenCalled();

		commit("-m", "fix: handle empty input");
		expect(determine()).toBe(0);
		expect(stdout).toHaveBeenCalledWith("v0.1.9");

		const breaking = commit("-m", "docs: record API changes", "-m", "BREAKING CHANGE: removed API");
		commit("-m", "feat: add a flag");
		expect(determine()).toBe(1);
		expect(stdout).not.toHaveBeenCalled();
		expect(stderr).toHaveBeenCalledWith(
			`Commit ${breaking}: Breaking change footers are forbidden`,
		);
	} finally {
		stdout.mockRestore();
		stderr.mockRestore();
		rmSync(cwd, { recursive: true, force: true });
	}
});

const mergeSubject = "Merge pull request #11 from llbbl/ci/release-policy";
const invalidSubject = "Expected a Conventional Commit subject";

test.each([
	{
		name: "skips a maintenance-only merge",
		branchMessage: "ci(release): enforce commit-based release rules",
	},
	{
		name: "selects a patch for a merged fix",
		branchMessage: "fix(cli): handle empty input",
		tag: "v0.0.1",
	},
	{
		name: "selects a minor for a merged feature",
		branchMessage: "feat(cli): add a flag",
		tag: "v0.1.0",
	},
	{
		name: "classifies a conventional merge subject",
		branchMessage: "docs: update usage",
		mergeMessage: "fix(cli): resolve a conflict",
		tag: "v0.0.1",
	},
	{
		name: "rejects an unrecognized merge subject",
		branchMessage: "docs: update usage",
		mergeMessage: "Merge branch topic",
		error: invalidSubject,
	},
	{
		name: "rejects a malformed underlying commit",
		branchMessage: "Update usage",
		error: invalidSubject,
		underlyingError: true,
	},
	{
		name: "rejects a breaking underlying commit",
		branchMessage: "fix!: change usage",
		error: "Breaking change markers are forbidden",
		underlyingError: true,
	},
	{
		name: "rejects a merge-shaped subject on a single-parent commit",
		branchMessage: mergeSubject,
		error: invalidSubject,
		underlyingError: true,
	},
	{
		name: "rejects a breaking footer on a generated merge",
		branchMessage: "docs: update usage",
		mergeMessage: `${mergeSubject}\n\nBREAKING CHANGE: removed API`,
		error: "Breaking change footers are forbidden",
	},
])("release CLI $name", ({ branchMessage, mergeMessage, tag, error, underlyingError }) => {
	const cwd = mkdtempSync(join(tmpdir(), "uncov-merge-"));
	const stdout = spyOn(console, "log").mockImplementation(() => {});
	const stderr = spyOn(console, "error").mockImplementation(() => {});
	try {
		git(cwd, "init", "--quiet", "--initial-branch=main");
		git(cwd, "commit", "--no-gpg-sign", "--allow-empty", "-m", "chore: start history");
		git(cwd, "switch", "--quiet", "-c", "topic");
		git(cwd, "commit", "--no-gpg-sign", "--allow-empty", "-m", branchMessage);
		const topic = git(cwd, "rev-parse", "HEAD");
		git(cwd, "switch", "--quiet", "main");
		git(cwd, "merge", "--no-ff", "--no-gpg-sign", "-m", mergeMessage ?? mergeSubject, "topic");
		const expectedSha = underlyingError ? topic : git(cwd, "rev-parse", "HEAD");

		expect(runReleasePolicy(["next"], cwd)).toBe(error ? 1 : 0);
		if (error) {
			expect(stderr).toHaveBeenCalledWith(
				expect.stringContaining(`Commit ${expectedSha}: ${error}`),
			);
		} else {
			expect(stderr).not.toHaveBeenCalled();
		}
		if (tag) {
			expect(stdout).toHaveBeenCalledWith(tag);
		} else {
			expect(stdout).not.toHaveBeenCalled();
		}
	} finally {
		stdout.mockRestore();
		stderr.mockRestore();
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("release CLI validates PR titles and publishing inputs", () => {
	const stderr = spyOn(console, "error").mockImplementation(() => {});
	try {
		expect(runReleasePolicy(["title", "ci(release): enforce version rules"])).toBe(0);
		expect(runReleasePolicy(["title", "fix!: change input"])).toBe(1);
		expect(runReleasePolicy(["publish", "v0.1.8", "0.1.8"])).toBe(0);
		expect(runReleasePolicy(["publish", "v1.0.0", "1.0.0"])).toBe(1);
		expect(runReleasePolicy(["publish", "v0.1.8"])).toBe(1);
		expect(stderr).toHaveBeenLastCalledWith(
			"Usage: release-policy.ts next | title <title> | publish <tag> <version>",
		);
	} finally {
		stderr.mockRestore();
	}
});
