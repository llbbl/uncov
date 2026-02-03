#!/bin/sh
# uncov installer script
# Usage: curl -fsSL https://raw.githubusercontent.com/llbbl/uncov/main/install.sh | bash

set -e

# Configuration
REPO="llbbl/uncov"
BINARY_NAME="uncov"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"
DOWNLOAD_BASE="https://github.com/${REPO}/releases/download"

# Colors (disabled if NO_COLOR is set or not a terminal)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Logging functions
info() {
    printf "%b\n" "$1"
}

success() {
    printf "%b\n" "${GREEN}$1${NC}"
}

warn() {
    printf "%b\n" "${YELLOW}$1${NC}"
}

error() {
    printf "%b\n" "${RED}Error: $1${NC}" >&2
    exit 1
}

# Check for required commands
check_commands() {
    if command -v curl >/dev/null 2>&1; then
        DOWNLOAD_CMD="curl"
    elif command -v wget >/dev/null 2>&1; then
        DOWNLOAD_CMD="wget"
    else
        error "Neither curl nor wget found. Please install one of them:
  - macOS: curl is pre-installed
  - Ubuntu/Debian: sudo apt install curl
  - Fedora: sudo dnf install curl
  - Alpine: apk add curl"
    fi

    # Check for sha256sum or shasum
    if command -v sha256sum >/dev/null 2>&1; then
        CHECKSUM_CMD="sha256sum"
    elif command -v shasum >/dev/null 2>&1; then
        CHECKSUM_CMD="shasum -a 256"
    else
        warn "Warning: Neither sha256sum nor shasum found. Skipping checksum verification."
        CHECKSUM_CMD=""
    fi
}

# Download a file with retry
download() {
    url="$1"
    output="$2"
    attempt=1
    max_attempts=2

    while [ $attempt -le $max_attempts ]; do
        if [ "$DOWNLOAD_CMD" = "curl" ]; then
            if curl -fsSL "$url" -o "$output" 2>/dev/null; then
                return 0
            fi
        else
            if wget -q "$url" -O "$output" 2>/dev/null; then
                return 0
            fi
        fi

        if [ $attempt -lt $max_attempts ]; then
            warn "Download failed, retrying..."
            attempt=$((attempt + 1))
            sleep 1
        else
            return 1
        fi
    done
}

# Download content to stdout
download_stdout() {
    url="$1"

    if [ "$DOWNLOAD_CMD" = "curl" ]; then
        curl -fsSL "$url" 2>/dev/null
    else
        wget -qO- "$url" 2>/dev/null
    fi
}

# Detect platform
detect_platform() {
    OS=$(uname -s)
    ARCH=$(uname -m)

    case "$OS" in
        Darwin)
            OS_NAME="darwin"
            ;;
        Linux)
            OS_NAME="linux"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            error "Windows is not supported via this installer.
Please download the binary manually from:
  https://github.com/${REPO}/releases

Download uncov-windows-x64.exe and add it to your PATH."
            ;;
        *)
            error "Unsupported operating system: $OS
Supported platforms:
  - macOS (darwin-arm64, darwin-x64)
  - Linux (linux-x64)"
            ;;
    esac

    case "$ARCH" in
        arm64|aarch64)
            ARCH_NAME="arm64"
            ;;
        x86_64|amd64)
            ARCH_NAME="x64"
            ;;
        *)
            error "Unsupported architecture: $ARCH
Supported architectures:
  - arm64 (Apple Silicon, aarch64)
  - x64 (Intel/AMD x86_64)"
            ;;
    esac

    # Check for unsupported combinations
    if [ "$OS_NAME" = "linux" ] && [ "$ARCH_NAME" = "arm64" ]; then
        error "Linux ARM64 is not currently supported.
Supported platforms:
  - macOS (darwin-arm64, darwin-x64)
  - Linux (linux-x64)"
    fi

    PLATFORM="${OS_NAME}-${ARCH_NAME}"
    info "Detected: ${BLUE}${PLATFORM}${NC}"
}

# Get latest version from GitHub
get_latest_version() {
    info "Fetching latest version..."

    VERSION=$(download_stdout "$GITHUB_API" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')

    if [ -z "$VERSION" ]; then
        error "Failed to fetch latest version from GitHub.
Please check your internet connection or try again later.
API URL: $GITHUB_API"
    fi

    # Validate version format (v1.2.3 or 1.2.3 with optional pre-release)
    case "$VERSION" in
        v[0-9]*|[0-9]*)
            ;;
        *)
            error "Invalid version format received: $VERSION"
            ;;
    esac

    info "Downloading uncov ${BLUE}${VERSION}${NC}..."
}

# Download and verify binary
download_binary() {
    BINARY_URL="${DOWNLOAD_BASE}/${VERSION}/${BINARY_NAME}-${PLATFORM}"
    CHECKSUM_URL="${BINARY_URL}.sha256"

    # Create temp directory
    TMP_DIR=$(mktemp -d) || error "Failed to create temporary directory"
    trap 'rm -rf "$TMP_DIR"' EXIT

    TMP_BINARY="${TMP_DIR}/${BINARY_NAME}"
    TMP_CHECKSUM="${TMP_DIR}/${BINARY_NAME}.sha256"

    # Download binary
    if ! download "$BINARY_URL" "$TMP_BINARY"; then
        error "Failed to download binary from:
  $BINARY_URL

Please check if the release exists for your platform."
    fi

    # Download and verify checksum if possible
    if [ -n "$CHECKSUM_CMD" ]; then
        if download "$CHECKSUM_URL" "$TMP_CHECKSUM"; then
            EXPECTED_CHECKSUM=$(awk '{print $1}' "$TMP_CHECKSUM")
            ACTUAL_CHECKSUM=$($CHECKSUM_CMD "$TMP_BINARY" | awk '{print $1}')

            if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
                error "Checksum verification failed!

Expected: $EXPECTED_CHECKSUM
Actual:   $ACTUAL_CHECKSUM

This could indicate a corrupted download or a security issue.
Please try again or download manually from:
  https://github.com/${REPO}/releases"
            fi
        else
            warn "Warning: Could not download checksum file. Skipping verification."
        fi
    fi

    chmod +x "$TMP_BINARY"
}

# Determine installation directory
determine_install_dir() {
    # Option 1: ~/.local/bin if it exists and is in PATH
    LOCAL_BIN="$HOME/.local/bin"
    if [ -d "$LOCAL_BIN" ]; then
        case ":$PATH:" in
            *":$LOCAL_BIN:"*)
                INSTALL_DIR="$LOCAL_BIN"
                return
                ;;
        esac
    fi

    # Option 2: /usr/local/bin if writable
    if [ -w "/usr/local/bin" ]; then
        INSTALL_DIR="/usr/local/bin"
        return
    fi

    # Option 3: Fall back to ~/.local/bin (create if needed)
    INSTALL_DIR="$LOCAL_BIN"
    if [ ! -d "$INSTALL_DIR" ]; then
        mkdir -p "$INSTALL_DIR"
    fi

    # Check if we need to warn about PATH
    case ":$PATH:" in
        *":$INSTALL_DIR:"*)
            ;;
        *)
            WARN_PATH=1
            ;;
    esac
}

# Install the binary
install_binary() {
    INSTALL_PATH="${INSTALL_DIR}/${BINARY_NAME}"

    info "Installing to ${BLUE}${INSTALL_PATH}${NC}..."

    if ! cp "$TMP_BINARY" "$INSTALL_PATH" 2>/dev/null; then
        # Try with sudo if direct copy fails
        if command -v sudo >/dev/null 2>&1; then
            warn "Permission denied. Attempting install with sudo..."
            sudo cp "$TMP_BINARY" "$INSTALL_PATH"
        else
            error "Failed to install to $INSTALL_PATH
You may need to run with elevated permissions or choose a different location."
        fi
    fi
}

# Print success message
print_success() {
    echo ""
    success "uncov ${VERSION} installed successfully!"
    echo ""

    if [ "${WARN_PATH:-}" = "1" ]; then
        warn "Note: ${INSTALL_DIR} is not in your PATH."
        info "Add it with: ${BLUE}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
        echo ""
        info "Add this line to your shell profile (~/.bashrc, ~/.zshrc, etc.) to make it permanent."
        echo ""
    fi

    info "Run '${BLUE}uncov --help${NC}' to get started."
}

# Main
main() {
    echo ""
    info "${BLUE}uncov${NC} installer"
    echo ""

    check_commands
    detect_platform
    get_latest_version
    download_binary
    determine_install_dir
    install_binary
    print_success
}

main
