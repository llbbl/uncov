# uncov - justfile
# Run `just` or `just help` to see available commands

# Default recipe: show help
default:
    @just --list --unsorted

# Install dependencies
install:
    bun install

# Install dependencies (frozen lockfile, for CI)
install-frozen:
    bun install --frozen-lockfile

# Run CLI locally (pass args after --)
dev *ARGS:
    bun run ./src/cli.ts {{ ARGS }}

# Run tests
test *ARGS:
    bun test {{ ARGS }}

# Run linter (Biome)
lint:
    bun run lint

# Fix lint issues and format code
lint-fix:
    bun run lint:fix

# Alias for lint-fix (Biome handles both)
format: lint-fix

# Build local binary for current platform
build:
    bun run build:local

# Build binaries for all platforms (darwin-arm64, darwin-x64, linux-x64, windows-x64)
build-all:
    bun run build

# Clean build artifacts
clean:
    rm -rf ./dist
    rm -f ./uncov

# Clean everything including dependencies
clean-all: clean
    rm -rf ./node_modules

# Run all checks (lint + test)
check: lint test

# CI workflow (install, lint, test)
ci: install-frozen lint test
