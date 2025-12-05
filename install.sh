#!/bin/bash
# UMKM Terminal - Install Script for macOS & Termux
# Usage: curl -fsSL <url>/install.sh | bash

set -e

# Simple colors (works on macOS and Termux)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}+---------------------------------------+${NC}"
echo -e "${CYAN}|     UMKM Terminal - Quick Install     |${NC}"
echo -e "${CYAN}+---------------------------------------+${NC}"
echo ""

# Detect platform
detect_platform() {
    if [[ -n "$TERMUX_VERSION" ]]; then
        PLATFORM="termux"
        echo -e "[*] Platform: ${GREEN}Termux (Android)${NC}"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
        echo -e "[*] Platform: ${GREEN}macOS${NC}"
    else
        PLATFORM="linux"
        echo -e "[*] Platform: ${GREEN}Linux${NC}"
    fi
}

# Check Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
        
        if [[ "$NODE_MAJOR" -ge 18 ]]; then
            echo -e "[*] Node.js: ${GREEN}v$NODE_VERSION${NC}"
            return 0
        else
            echo -e "[!] Node.js: ${YELLOW}v$NODE_VERSION${NC} (need v18+)"
            return 1
        fi
    else
        echo -e "[!] Node.js: ${RED}Not installed${NC}"
        return 1
    fi
}

# Install Node.js
install_node() {
    echo ""
    echo -e "${YELLOW}[*] Installing Node.js...${NC}"
    
    case "$PLATFORM" in
        termux)
            pkg update -y
            pkg install -y nodejs-lts
            ;;
        macos)
            if command -v brew &> /dev/null; then
                brew install node
            else
                echo -e "${RED}[!] Homebrew not found. Installing...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                brew install node
            fi
            ;;
        *)
            echo -e "${RED}[!] Please install Node.js manually: https://nodejs.org${NC}"
            exit 1
            ;;
    esac
}

# Install UMKM
install_umkm() {
    echo ""
    echo -e "${CYAN}[*] Installing UMKM Terminal...${NC}"
    npm install -g umkm-terminal
}

# Main
main() {
    detect_platform
    
    if ! check_node; then
        install_node
        
        # Reload shell for Termux
        if [[ "$PLATFORM" == "termux" ]]; then
            hash -r
        fi
        
        if ! check_node; then
            echo -e "${RED}[!] Node.js installation failed${NC}"
            exit 1
        fi
    fi
    
    install_umkm
    
    echo ""
    echo -e "${GREEN}+---------------------------------------+${NC}"
    echo -e "${GREEN}|       Installation Complete!          |${NC}"
    echo -e "${GREEN}+---------------------------------------+${NC}"
    echo ""
    echo "  Quick Start:"
    echo "  1. Create .env with PRIVATE_KEY"
    echo "  2. Run: umkm"
    echo ""
}

main
