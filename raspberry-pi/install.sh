#!/bin/bash

# NetMonitor Pro Raspberry Pi Installation Script
# This script installs and configures the monitoring agent on Raspberry Pi

set -e  # Exit on any error

echo "=================================="
echo "NetMonitor Pro Agent Installation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
    exit 1
fi

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    print_warning "This doesn't appear to be a Raspberry Pi. Continuing anyway..."
fi

print_status "Starting installation..."

# Update package list
print_status "Updating package list..."
sudo apt-get update -qq

# Install required system packages
print_status "Installing required packages..."
sudo apt-get install -y python3 python3-pip curl

# Create installation directory
print_status "Creating installation directory..."
sudo mkdir -p /opt/netmonitor
cd /opt/netmonitor

# Determine server URL from script location
if [[ -n "$NETMONITOR_SERVER" ]]; then
    SERVER_URL="$NETMONITOR_SERVER"
else
    # Try to detect from script download URL or use localhost
    SERVER_URL="http://localhost:5000"
    print_warning "Using default server URL: $SERVER_URL"
    print_warning "Set NETMONITOR_SERVER environment variable to specify a different URL"
fi

# Download monitoring script
print_status "Downloading monitoring script..."
if ! sudo curl -sSL -f "${SERVER_URL}/monitor.py" -o monitor.py; then
    print_error "Failed to download monitor.py from ${SERVER_URL}/monitor.py"
    print_error "Please check the server URL and try again"
    exit 1
fi

# Make script executable
sudo chmod +x monitor.py

# Install Python dependencies
print_status "Installing Python dependencies..."
sudo pip3 install requests psutil

# Create configuration file
print_status "Creating configuration..."
cat > /tmp/netmonitor.env << EOF
NETMONITOR_SERVER=${SERVER_URL}
NETMONITOR_NAME=$(hostname)
HEARTBEAT_INTERVAL=30
EOF

sudo mv /tmp/netmonitor.env /opt/netmonitor/.env

# Create systemd service file
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/netmonitor.service > /dev/null << EOF
[Unit]
Description=NetMonitor Pro Agent
Documentation=https://github.com/your-repo/netmonitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/opt/netmonitor
EnvironmentFile=/opt/netmonitor/.env
ExecStart=/usr/bin/python3 /opt/netmonitor/monitor.py
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log

[Install]
WantedBy=multi-user.target
EOF

# Set correct ownership
sudo chown -R pi:pi /opt/netmonitor

# Create log file
sudo touch /var/log/netmonitor.log
sudo chown pi:pi /var/log/netmonitor.log

# Reload systemd and enable service
print_status "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable netmonitor.service

# Start the service
if sudo systemctl start netmonitor.service; then
    print_status "Service started successfully!"
else
    print_error "Failed to start service. Check logs with: sudo journalctl -u netmonitor -f"
    exit 1
fi

# Show service status
print_status "Service status:"
sudo systemctl status netmonitor.service --no-pager --lines=5

echo ""
echo "=================================="
print_status "Installation completed successfully!"
echo "=================================="
echo ""
echo "Service Management Commands:"
echo "  Start:   sudo systemctl start netmonitor"
echo "  Stop:    sudo systemctl stop netmonitor"
echo "  Restart: sudo systemctl restart netmonitor"
echo "  Status:  sudo systemctl status netmonitor"
echo "  Logs:    sudo journalctl -u netmonitor -f"
echo ""
echo "Configuration file: /opt/netmonitor/.env"
echo "Log file: /var/log/netmonitor.log"
echo ""
print_status "The agent should now be sending data to: ${SERVER_URL}"
