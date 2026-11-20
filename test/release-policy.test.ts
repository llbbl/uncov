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
	const git = (...args: string[]) => {
		const result = Bun.spawnSync(
			["git", "-c", "user.name=Release Test", "-c", "user.email=test@example.invalid", ...args],
			{ cwd, env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } },
		);
		if (result.exitCode !== 0) throw new Error(result.stderr.toString());
		return result.stdout.toString().trim();
	};
	const commit = (...args: string[]) => {
		git("-c", "commit.gpgSign=false", "commit", "--allow-empty", ...args);
		return git("rev-parse", "HEAD");
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
		git("init", "--quiet");
		commit("-m", "feat: initialize project");
		expect(determine()).toBe(0);
		expect(stdout).toHaveBeenCalledWith("v0.1.0");
		commit("-m", "Legacy subject");
		git("-c", "tag.gpgSign=false", "tag", "-a", "v0.1.8", "-m", "Release v0.1.8");
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
