/**
 * Unit tests for file system utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	appendLine,
	ensureDir,
	fileExists,
	readJson,
	readText,
	resolvePath,
	validatePath,
	writeJson,
	writeText,
} from "../../src/utils/fs";

const TEST_DIR = join(import.meta.dir, "..", ".tmp-fs-test");

describe("fs utilities", () => {
	beforeEach(() => {
		// Clean up and create test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("fileExists", () => {
		it("should return true for existing file", () => {
			const filePath = join(TEST_DIR, "exists.txt");
			writeFileSync(filePath, "test");
			expect(fileExists(filePath)).toBe(true);
		});

		it("should return false for non-existing file", () => {
			const filePath = join(TEST_DIR, "does-not-exist.txt");
			expect(fileExists(filePath)).toBe(false);
		});

		it("should return true for existing directory", () => {
			expect(fileExists(TEST_DIR)).toBe(true);
		});
	});

	describe("readJson", () => {
		it("should read and parse valid JSON file", () => {
			const filePath = join(TEST_DIR, "valid.json");
			const data = { name: "test", value: 42 };
			writeFileSync(filePath, JSON.stringify(data));

			const result = readJson<typeof data>(filePath);
			expect(result).toEqual(data);
		});

		it("should handle nested objects", () => {
			const filePath = join(TEST_DIR, "nested.json");
			const data = { nested: { deep: { value: true } } };
			writeFileSync(filePath, JSON.stringify(data));

			const result = readJson<typeof data>(filePath);
			expect(result.nested.deep.value).toBe(true);
		});

		it("should throw descriptive error for non-existing file", () => {
			const filePath = join(TEST_DIR, "missing.json");
			expect(() => readJson(filePath)).toThrow(`Failed to read file "${filePath}"`);
		});

		it("should throw descriptive error for invalid JSON", () => {
			const filePath = join(TEST_DIR, "invalid.json");
			writeFileSync(filePath, "{ not valid json }");

			expect(() => readJson(filePath)).toThrow(`Failed to parse JSON in "${filePath}"`);
		});

		it("should handle arrays", () => {
			const filePath = join(TEST_DIR, "array.json");
			const data = [1, 2, 3, "test"];
			writeFileSync(filePath, JSON.stringify(data));

			const result = readJson<typeof data>(filePath);
			expect(result).toEqual(data);
		});
	});

	describe("writeJson", () => {
		it("should write JSON with 2-space indent", () => {
			const filePath = join(TEST_DIR, "output.json");
			const data = { name: "test" };
			writeJson(filePath, data);

			const content = readFileSync(filePath, "utf-8");
			expect(content).toBe('{\n  "name": "test"\n}\n');
		});

		it("should create parent directories", () => {
			const filePath = join(TEST_DIR, "nested", "deep", "output.json");
			const data = { value: 123 };
			writeJson(filePath, data);

			expect(existsSync(filePath)).toBe(true);
			const result = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(result).toEqual(data);
		});

		it("should overwrite existing file", () => {
			const filePath = join(TEST_DIR, "overwrite.json");
			writeFileSync(filePath, '{"old": true}');
			writeJson(filePath, { new: true });

			const result = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(result).toEqual({ new: true });
		});
	});

	describe("readText", () => {
		it("should read text file contents", () => {
			const filePath = join(TEST_DIR, "text.txt");
			writeFileSync(filePath, "Hello, World!");

			expect(readText(filePath)).toBe("Hello, World!");
		});

		it("should preserve line endings", () => {
			const filePath = join(TEST_DIR, "multiline.txt");
			const content = "line1\nline2\nline3\n";
			writeFileSync(filePath, content);

			expect(readText(filePath)).toBe(content);
		});

		it("should throw descriptive error for non-existing file", () => {
			const filePath = join(TEST_DIR, "missing.txt");
			expect(() => readText(filePath)).toThrow(`Failed to read file "${filePath}"`);
		});

		it("should handle empty files", () => {
			const filePath = join(TEST_DIR, "empty.txt");
			writeFileSync(filePath, "");

			expect(readText(filePath)).toBe("");
		});
	});

	describe("writeText", () => {
		it("should write text to file", () => {
			const filePath = join(TEST_DIR, "write.txt");
			writeText(filePath, "Test content");

			expect(readFileSync(filePath, "utf-8")).toBe("Test content");
		});

		it("should create parent directories", () => {
			const filePath = join(TEST_DIR, "nested", "deep", "file.txt");
			writeText(filePath, "Deep content");

			expect(existsSync(filePath)).toBe(true);
			expect(readFileSync(filePath, "utf-8")).toBe("Deep content");
		});

		it("should overwrite existing file", () => {
			const filePath = join(TEST_DIR, "overwrite.txt");
			writeFileSync(filePath, "Old content");
			writeText(filePath, "New content");

			expect(readFileSync(filePath, "utf-8")).toBe("New content");
		});
	});

	describe("ensureDir", () => {
		it("should create directory if it does not exist", () => {
			const dirPath = join(TEST_DIR, "new-dir");
			ensureDir(dirPath);

			expect(existsSync(dirPath)).toBe(true);
		});

		it("should create nested directories", () => {
			const dirPath = join(TEST_DIR, "a", "b", "c");
			ensureDir(dirPath);

			expect(existsSync(dirPath)).toBe(true);
		});

		it("should not throw if directory already exists", () => {
			const dirPath = join(TEST_DIR, "existing");
			mkdirSync(dirPath);

			expect(() => ensureDir(dirPath)).not.toThrow();
			expect(existsSync(dirPath)).toBe(true);
		});

		it("should handle empty path gracefully", () => {
			expect(() => ensureDir("")).not.toThrow();
		});

		it("should handle current directory", () => {
			expect(() => ensureDir(".")).not.toThrow();
		});
	});

	describe("appendLine", () => {
		it("should create file and append line if file does not exist", () => {
			const filePath = join(TEST_DIR, "new-append.txt");
			appendLine(filePath, "First line");

			expect(readFileSync(filePath, "utf-8")).toBe("First line\n");
		});

		it("should append line to existing file ending with newline", () => {
			const filePath = join(TEST_DIR, "append-newline.txt");
			writeFileSync(filePath, "Line 1\n");
			appendLine(filePath, "Line 2");

			expect(readFileSync(filePath, "utf-8")).toBe("Line 1\nLine 2\n");
		});

		it("should add newline before appending if file does not end with newline", () => {
			const filePath = join(TEST_DIR, "append-no-newline.txt");
			writeFileSync(filePath, "Line 1");
			appendLine(filePath, "Line 2");

			expect(readFileSync(filePath, "utf-8")).toBe("Line 1\nLine 2\n");
		});

		it("should handle multiple appends", () => {
			const filePath = join(TEST_DIR, "multi-append.txt");
			appendLine(filePath, "Line 1");
			appendLine(filePath, "Line 2");
			appendLine(filePath, "Line 3");

			expect(readFileSync(filePath, "utf-8")).toBe("Line 1\nLine 2\nLine 3\n");
		});

		it("should create parent directories", () => {
			const filePath = join(TEST_DIR, "nested", "append.txt");
			appendLine(filePath, "Nested line");

			expect(existsSync(filePath)).toBe(true);
			expect(readFileSync(filePath, "utf-8")).toBe("Nested line\n");
		});

		it("should handle empty file", () => {
			const filePath = join(TEST_DIR, "empty-append.txt");
			writeFileSync(filePath, "");
			appendLine(filePath, "First line");

			expect(readFileSync(filePath, "utf-8")).toBe("First line\n");
		});
	});

	describe("resolvePath", () => {
		it("should resolve relative path to absolute", () => {
			const result = resolvePath("src/cli.ts", "/Users/test/project");
			expect(result).toBe("/Users/test/project/src/cli.ts");
		});

		it("should use cwd if not specified", () => {
			const result = resolvePath("test.txt");
			expect(result).toBe(join(process.cwd(), "test.txt"));
		});

		it("should handle absolute paths", () => {
			const result = resolvePath("/absolute/path.txt", "/some/base");
			expect(result).toBe("/absolute/path.txt");
		});

		it("should resolve parent directory references", () => {
			const result = resolvePath("../sibling/file.txt", "/Users/test/project");
			expect(result).toBe("/Users/test/sibling/file.txt");
		});
	});

	describe("validatePath", () => {
		it("should allow paths within base directory", () => {
			const result = validatePath("subdir/file.txt", "/Users/test/project");
			expect(result).toBe("/Users/test/project/subdir/file.txt");
		});

		it("should allow nested subdirectories", () => {
			const result = validatePath("a/b/c/file.txt", "/base");
			expect(result).toBe("/base/a/b/c/file.txt");
		});

		it("should allow files directly in base directory", () => {
			const result = validatePath("file.txt", "/base");
			expect(result).toBe("/base/file.txt");
		});

		it("should throw for simple parent traversal", () => {
			expect(() => validatePath("../etc/passwd", "/base")).toThrow(
				'Path "../etc/passwd" is outside allowed directory',
			);
		});

		it("should throw for deep parent traversal", () => {
			expect(() => validatePath("../../../etc/passwd", "/home/user/project")).toThrow(
				'Path "../../../etc/passwd" is outside allowed directory',
			);
		});

		it("should throw for traversal embedded in path", () => {
			expect(() => validatePath("subdir/../../etc/passwd", "/base")).toThrow(
				'Path "subdir/../../etc/passwd" is outside allowed directory',
			);
		});

		it("should throw for absolute paths outside base", () => {
			expect(() => validatePath("/etc/passwd", "/base")).toThrow(
				'Path "/etc/passwd" is outside allowed directory',
			);
		});

		it("should use cwd as default base directory", () => {
			const cwd = process.cwd();
			const result = validatePath("test.txt");
			expect(result).toBe(join(cwd, "test.txt"));
		});

		it("should handle path with dot components that stay within base", () => {
			const result = validatePath("./subdir/../other/file.txt", "/base");
			expect(result).toBe("/base/other/file.txt");
		});
	});

	describe("path traversal protection with baseDir option", () => {
		it("readJson should throw for path traversal when baseDir is set", () => {
			expect(() => readJson("../../../etc/passwd", { baseDir: TEST_DIR })).toThrow(
				"is outside allowed directory",
			);
		});

		it("readJson should work for valid paths when baseDir is set", () => {
			const filePath = join(TEST_DIR, "valid.json");
			writeFileSync(filePath, '{"valid": true}');

			const result = readJson<{ valid: boolean }>("valid.json", { baseDir: TEST_DIR });
			expect(result).toEqual({ valid: true });
		});

		it("writeJson should throw for path traversal when baseDir is set", () => {
			expect(() =>
				writeJson("../../../tmp/evil.json", { bad: true }, { baseDir: TEST_DIR }),
			).toThrow("is outside allowed directory");
		});

		it("readText should throw for path traversal when baseDir is set", () => {
			expect(() => readText("../../../etc/passwd", { baseDir: TEST_DIR })).toThrow(
				"is outside allowed directory",
			);
		});

		it("writeText should throw for path traversal when baseDir is set", () => {
			expect(() => writeText("../../../tmp/evil.txt", "bad", { baseDir: TEST_DIR })).toThrow(
				"is outside allowed directory",
			);
		});

		it("appendLine should throw for path traversal when baseDir is set", () => {
			expect(() => appendLine("../../../tmp/evil.txt", "bad", { baseDir: TEST_DIR })).toThrow(
				"is outside allowed directory",
			);
		});

		it("operations should work normally without baseDir", () => {
			// This should not throw even with ../ because no baseDir is provided
			// It will fail for other reasons (file not existing), not path validation
			const filePath = join(TEST_DIR, "no-base.json");
			writeFileSync(filePath, '{"test": true}');

			// Direct path should work
			const result = readJson<{ test: boolean }>(filePath);
			expect(result).toEqual({ test: true });
		});
	});
});
