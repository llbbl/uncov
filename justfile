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

# Generate full changelog
changelog:
    git cliff -o CHANGELOG.md

# Preview unreleased changes
changelog-preview:
    git cliff --unreleased

# ============================================================================
# Version Management
# ============================================================================

# Show current version
version:
    @echo "Current version: $(jq -r '.version' package.json)"

# Bump patch version (0.1.2 → 0.1.3)
bump-patch:
    #!/bin/sh
    set -e
    CURRENT=$(jq -r '.version' package.json)
    echo "Current version: $CURRENT"
    npm version patch --no-git-tag-version >/dev/null
    NEW=$(jq -r '.version' package.json)
    echo "New version: $NEW"
    git add package.json
    git commit -m "chore(release): bump version to $NEW"
    git tag "v$NEW"
    echo ""
    echo "Created tag v$NEW"
    echo ""
    echo "Push with:"
    echo "  git push origin main --tags"

# Bump minor version (0.1.2 → 0.2.0)
bump-minor:
    #!/bin/sh
    set -e
    CURRENT=$(jq -r '.version' package.json)
    echo "Current version: $CURRENT"
    npm version minor --no-git-tag-version >/dev/null
    NEW=$(jq -r '.version' package.json)
    echo "New version: $NEW"
    git add package.json
    git commit -m "chore(release): bump version to $NEW"
    git tag "v$NEW"
    echo ""
    echo "Created tag v$NEW"
    echo ""
    echo "Push with:"
    echo "  git push origin main --tags"

# Bump major version (0.1.2 → 1.0.0)
bump-major:
    #!/bin/sh
    set -e
    CURRENT=$(jq -r '.version' package.json)
    echo "Current version: $CURRENT"
    npm version major --no-git-tag-version >/dev/null
    NEW=$(jq -r '.version' package.json)
    echo "New version: $NEW"
    git add package.json
    git commit -m "chore(release): bump version to $NEW"
    git tag "v$NEW"
    echo ""
    echo "Created tag v$NEW"
    echo ""
    echo "Push with:"
    echo "  git push origin main --tags"

# Release: bump patch, push, and trigger release workflow
release-patch: bump-patch
    git push origin main --tags

# Release: bump minor, push, and trigger release workflow
release-minor: bump-minor
    git push origin main --tags

# Release: bump major, push, and trigger release workflow
release-major: bump-major
    git push origin main --tags
