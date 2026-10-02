/**
 * Tests for color utilities
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createColors, isColorSupported } from "../../src/utils/colors";

describe("colors", () => {
	let originalNoColor: string | undefined;
	let originalIsTTY: PropertyDescriptor | undefined;

	beforeEach(() => {
		// Save original values
		originalNoColor = process.env.NO_COLOR;
		originalIsTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
		delete process.env.NO_COLOR;
		Object.defineProperty(process.stdout, "isTTY", {
			configurable: true,
			value: false,
			writable: true,
		});
	});

	afterEach(() => {
		// Restore original values
		if (originalNoColor === undefined) {
			delete process.env.NO_COLOR;
		} else {
			process.env.NO_COLOR = originalNoColor;
		}
		if (originalIsTTY === undefined) {
			Reflect.deleteProperty(process.stdout, "isTTY");
		} else {
			Object.defineProperty(process.stdout, "isTTY", originalIsTTY);
		}
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

		it("should return false without a TTY", () => {
			expect(isColorSupported(false)).toBe(false);
		});

		it("should return true with a TTY and NO_COLOR unset", () => {
			Object.defineProperty(process.stdout, "isTTY", { value: true });
			expect(isColorSupported(false)).toBe(true);
		});
	});

	describe("createColors", () => {
		it("should return color functions when enabled", () => {
			Object.defineProperty(process.stdout, "isTTY", { value: true });

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
			Object.defineProperty(process.stdout, "isTTY", { value: true });
			const colors = createColors(false);

			expect(colors.red("test")).toBe("\x1b[31mtest\x1b[0m");
			expect(colors.green("test")).toBe("\x1b[32mtest\x1b[0m");
			expect(colors.yellow("test")).toBe("\x1b[33mtest\x1b[0m");
			expect(colors.cyan("test")).toBe("\x1b[36mtest\x1b[0m");
			expect(colors.bold("test")).toBe("\x1b[1mtest\x1b[0m");
			expect(colors.dim("test")).toBe("\x1b[2mtest\x1b[0m");
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
