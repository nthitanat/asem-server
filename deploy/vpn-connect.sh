#!/bin/bash

# VPN Connection Script for Chula VPN
# Supports OpenConnect (Cisco AnyConnect) and OpenVPN

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "❌ Error: config.sh not found!"
    echo "   Create deploy/config.sh with VPN credentials"
    exit 1
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if VPN is already connected
check_vpn_connection() {
    if [ "$VPN_PROTOCOL" = "openconnect" ]; then
        if pgrep -x "openconnect" > /dev/null; then
            echo -e "${GREEN}✅ VPN already connected (OpenConnect)${NC}"
            return 0
        fi
    elif [ "$VPN_PROTOCOL" = "openvpn" ]; then
        if pgrep -x "openvpn" > /dev/null; then
            echo -e "${GREEN}✅ VPN already connected (OpenVPN)${NC}"
            return 0
        fi
    fi
    return 1
}

# Function to connect via OpenConnect (Cisco AnyConnect)
connect_openconnect() {
    echo -e "${YELLOW}🔌 Connecting to VPN via OpenConnect...${NC}"
    
    # Check if openconnect is installed
    if ! command -v openconnect &> /dev/null; then
        echo -e "${RED}❌ OpenConnect is not installed${NC}"
        echo "   Install with: brew install openconnect"
        exit 1
    fi
    
    # Create password file temporarily
    echo "$VPN_PASSWORD" | sudo openconnect \
        --user="$VPN_USERNAME" \
        --passwd-on-stdin \
        --background \
        "$VPN_HOST" 2>&1 | tee /tmp/vpn-connect.log
    
    # Check if connection was successful
    sleep 2
    if pgrep -x "openconnect" > /dev/null; then
        echo -e "${GREEN}✅ VPN connected successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ VPN connection failed${NC}"
        cat /tmp/vpn-connect.log
        return 1
    fi
}

# Function to connect via OpenVPN
connect_openvpn() {
    echo -e "${YELLOW}🔌 Connecting to VPN via OpenVPN...${NC}"
    
    # Check if openvpn is installed
    if ! command -v openvpn &> /dev/null; then
        echo -e "${RED}❌ OpenVPN is not installed${NC}"
        echo "   Install with: brew install openvpn"
        exit 1
    fi
    
    # Check if config file exists
    if [ ! -f "$SCRIPT_DIR/vpn-config.ovpn" ]; then
        echo -e "${RED}❌ VPN config file not found: $SCRIPT_DIR/vpn-config.ovpn${NC}"
        echo "   Please provide the .ovpn configuration file"
        exit 1
    fi
    
    # Connect
    sudo openvpn \
        --config "$SCRIPT_DIR/vpn-config.ovpn" \
        --daemon \
        --log /tmp/vpn-connect.log
    
    # Check if connection was successful
    sleep 3
    if pgrep -x "openvpn" > /dev/null; then
        echo -e "${GREEN}✅ VPN connected successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ VPN connection failed${NC}"
        cat /tmp/vpn-connect.log
        return 1
    fi
}

# Function to disconnect VPN
disconnect_vpn() {
    echo -e "${YELLOW}🔌 Disconnecting VPN...${NC}"
    
    if [ "$VPN_PROTOCOL" = "openconnect" ]; then
        sudo pkill -SIGTERM openconnect || true
    elif [ "$VPN_PROTOCOL" = "openvpn" ]; then
        sudo pkill -SIGTERM openvpn || true
    fi
    
    sleep 1
    echo -e "${GREEN}✅ VPN disconnected${NC}"
}

# Main execution
case "${1:-connect}" in
    connect)
        # Check if already connected
        if check_vpn_connection; then
            exit 0
        fi
        
        # Connect based on protocol
        if [ "$VPN_PROTOCOL" = "openconnect" ]; then
            connect_openconnect
        elif [ "$VPN_PROTOCOL" = "openvpn" ]; then
            connect_openvpn
        else
            echo -e "${RED}❌ Unknown VPN protocol: $VPN_PROTOCOL${NC}"
            echo "   Set VPN_PROTOCOL in config.sh to 'openconnect' or 'openvpn'"
            exit 1
        fi
        ;;
    
    disconnect)
        disconnect_vpn
        ;;
    
    status)
        if check_vpn_connection; then
            exit 0
        else
            echo -e "${YELLOW}⚠️  VPN not connected${NC}"
            exit 1
        fi
        ;;
    
    *)
        echo "Usage: $0 {connect|disconnect|status}"
        exit 1
        ;;
esac
