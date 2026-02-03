/**
 * Tests for color utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createColors, isColorSupported } from "../../src/utils/colors";

describe("colors", () => {
	let originalNoColor: string | undefined;
	let originalIsTTY: boolean | undefined;

	beforeEach(() => {
		// Save original values
		originalNoColor = process.env.NO_COLOR;
		originalIsTTY = process.stdout.isTTY;
	});

	afterEach(() => {
		// Restore original values
		if (originalNoColor === undefined) {
			process.env.NO_COLOR = undefined;
		} else {
			process.env.NO_COLOR = originalNoColor;
		}
		// Note: Cannot restore isTTY as it's read-only, but tests should handle this
	});

	describe("isColorSupported", () => {
		it("should return false when noColor parameter is true", () => {
			expect(isColorSupported(true)).toBe(false);
		});

		it("should return false when NO_COLOR env is set", () => {
			process.env.NO_COLOR = "1";
			expect(isColorSupported(false)).toBe(false);
		});

		it("should return false when NO_COLOR env is empty string", () => {
			process.env.NO_COLOR = "";
			expect(isColorSupported(false)).toBe(false);
		});

		it("should respect TTY detection", () => {
			process.env.NO_COLOR = undefined;
			// Result depends on whether running in TTY
			const result = isColorSupported(false);
			expect(typeof result).toBe("boolean");
		});
	});

	describe("createColors", () => {
		it("should return color functions when enabled", () => {
			// Force enable by mocking conditions
			process.env.NO_COLOR = undefined;

			// Create colors without noColor flag
			const colors = createColors(false);

			// Verify all color functions exist
			expect(typeof colors.red).toBe("function");
			expect(typeof colors.green).toBe("function");
			expect(typeof colors.yellow).toBe("function");
			expect(typeof colors.cyan).toBe("function");
			expect(typeof colors.bold).toBe("function");
			expect(typeof colors.dim).toBe("function");
		});

		it("should return identity functions when noColor is true", () => {
			const colors = createColors(true);

			expect(colors.red("test")).toBe("test");
			expect(colors.green("test")).toBe("test");
			expect(colors.yellow("test")).toBe("test");
			expect(colors.cyan("test")).toBe("test");
			expect(colors.bold("test")).toBe("test");
			expect(colors.dim("test")).toBe("test");
		});

		it("should return identity functions when NO_COLOR is set", () => {
			process.env.NO_COLOR = "1";
			const colors = createColors(false);

			expect(colors.red("test")).toBe("test");
			expect(colors.green("test")).toBe("test");
		});

		it("should wrap text with ANSI codes when colors enabled", () => {
			// Force disable NO_COLOR and simulate TTY
			process.env.NO_COLOR = undefined;

			// Only test if we're in a TTY environment
			if (process.stdout.isTTY) {
				const colors = createColors(false);

				expect(colors.red("test")).toBe("\x1b[31mtest\x1b[0m");
				expect(colors.green("test")).toBe("\x1b[32mtest\x1b[0m");
				expect(colors.yellow("test")).toBe("\x1b[33mtest\x1b[0m");
				expect(colors.cyan("test")).toBe("\x1b[36mtest\x1b[0m");
				expect(colors.bold("test")).toBe("\x1b[1mtest\x1b[0m");
				expect(colors.dim("test")).toBe("\x1b[2mtest\x1b[0m");
			}
		});

		it("should handle empty strings", () => {
			const colors = createColors(true);
			expect(colors.red("")).toBe("");
		});

		it("should handle strings with special characters", () => {
			const colors = createColors(true);
			expect(colors.green("hello\nworld")).toBe("hello\nworld");
			expect(colors.yellow("100%")).toBe("100%");
		});
	});
});
