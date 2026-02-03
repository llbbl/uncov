# uncov

[![CI](https://github.com/llbbl/uncov/actions/workflows/ci.yml/badge.svg)](https://github.com/llbbl/uncov/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/llbbl/uncov/branch/main/graph/badge.svg)](https://codecov.io/gh/llbbl/uncov)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A zero-dependency CLI tool that reports files with low test coverage from Vitest/Istanbul JSON output.

## Features

- **Zero dependencies** - Single binary, instant startup
- **Zero config** - Just run `uncov` in any project with coverage output
- **Cross-platform** - Binaries for macOS (arm64, x64), Linux (x64), Windows (x64)
- **CI-friendly** - JSON output, exit codes for automation
- **Optional setup** - Bootstrap coverage scripts with `uncov init`

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/llbbl/uncov/main/install.sh | bash
```

This automatically detects your platform, downloads the latest binary, verifies the checksum, and installs to your PATH.

### npm / pnpm / bun

```bash
# npm
npm install -g uncov

# pnpm
pnpm add -g uncov

# bun
bun add -g uncov
```

### Download Binary

Download the latest release for your platform from [GitHub Releases](https://github.com/llbbl/uncov/releases).

```bash
# macOS (Apple Silicon)
curl -fsSL https://github.com/llbbl/uncov/releases/latest/download/uncov-darwin-arm64 -o uncov
chmod +x uncov
sudo mv uncov /usr/local/bin/

# macOS (Intel)
curl -fsSL https://github.com/llbbl/uncov/releases/latest/download/uncov-darwin-x64 -o uncov
chmod +x uncov
sudo mv uncov /usr/local/bin/

# Linux
curl -fsSL https://github.com/llbbl/uncov/releases/latest/download/uncov-linux-x64 -o uncov
chmod +x uncov
sudo mv uncov /usr/local/bin/
```

### Build from Source

```bash
git clone https://github.com/llbbl/uncov.git
cd uncov
bun install
bun run build:local
```

## Quick Start

1. Run your tests with coverage:
   ```bash
   pnpm test:coverage
   # or
   vitest run --coverage
   ```

2. Report low coverage files:
   ```bash
   uncov
   ```

Output:
```
Files at or below 10% line coverage: 3

   0.00%  LH    0/LF  120   src/renderer.ts
   5.26%  LH    2/LF   38   src/bootstrap.ts
  10.00%  LH   10/LF  100   src/engine.ts
```

## Commands

### `uncov` (default)

Report files below coverage threshold.

```bash
uncov                     # Files at or below 10% coverage (default)
uncov --threshold 50      # Files at or below 50% coverage
uncov --threshold 0       # Only 0% coverage files
uncov --fail              # Exit 1 if any files below threshold
uncov --json              # JSON output for scripting
uncov --verbose           # Show debug information
uncov --no-color          # Disable colorized output
```

### `uncov init`

Bootstrap coverage configuration in your project.

```bash
uncov init                # Interactive setup
uncov init --force        # Overwrite existing config
uncov init --dry-run      # Preview changes without modifying files
```

This command:
1. Detects your package manager (pnpm, bun, npm, yarn)
2. Adds scripts to `package.json`:
   - `test:coverage` - Run tests with coverage
   - `coverage:low` - Run uncov
3. Creates `vitest.config.ts` with coverage settings
4. Adds `coverage/` to `.gitignore`

### `uncov check`

Verify coverage setup is correct.

```bash
uncov check               # Verify setup
uncov check --verbose     # Show detailed check information
```

Checks:
- Vitest config exists
- Coverage config is present
- `coverage-summary.json` exists
- Required scripts are configured

## Configuration

### uncov.config.json

```json
{
  "threshold": 10,
  "exclude": ["**/*.test.ts", "**/index.ts"],
  "failOnLow": false,
  "coveragePath": "coverage/coverage-summary.json"
}
```

### package.json

```json
{
  "uncov": {
    "threshold": 20,
    "failOnLow": true
  }
}
```

### Configuration Priority

1. CLI flags (highest)
2. `uncov.config.json`
3. `package.json` uncov field
4. Defaults (lowest)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (or low coverage files found but `--fail` not set) |
| 1 | Low coverage files found and `--fail` set |
| 2 | Missing coverage-summary.json or config error |

## Development

### Setup

```bash
git clone https://github.com/llbbl/uncov.git
cd uncov
bun install
```

### Commands

Using [Just](https://github.com/casey/just) (recommended):

```bash
just              # Show available commands
just install      # Install dependencies
just dev          # Run CLI locally
just dev --help   # Run CLI with args
just test         # Run tests
just lint         # Lint with Biome
just lint-fix     # Fix lint issues
just build        # Build local binary
just build-all    # Build all platform binaries
just check        # Run lint + tests
just clean        # Remove build artifacts
```

Or using bun directly:

```bash
bun run dev           # Run CLI locally
bun test              # Run tests
bun run lint          # Lint with Biome
bun run lint:fix      # Fix lint issues
bun run build:local   # Build local binary
bun run build         # Build all platform binaries
```

### Project Structure

```
uncov/
├── src/
│   ├── cli.ts              # Entry point, arg parsing
│   ├── commands/           # Command implementations
│   ├── lib/                # Core logic
│   └── utils/              # Helpers
├── test/                   # Tests
├── scripts/
│   └── build.ts            # Cross-platform build
└── docs/
    └── spec.md             # Full specification
```

See [docs/spec.md](docs/spec.md) for the full specification.

## License

MIT
