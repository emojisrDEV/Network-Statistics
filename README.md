# NetMonitor Pro

A comprehensive network monitoring and management application built with Python Flask.

## Features

- **Real-time System Monitoring**: CPU, memory, disk usage, and network interfaces
- **Multi-layered Failsafe System**: Primary monitoring, backup monitoring, and emergency fallback
- **Raspberry Pi Integration**: Remote monitoring nodes with automatic fallback to host monitoring
- **Network Device Discovery**: Automatic detection and monitoring of network devices
- **Web Dashboard**: Clean, responsive interface with real-time charts and statistics
- **Alert Management**: Track and manage network alerts and incidents

## Quick Start

### Method 1: Simple Start
```bash
python3 start_python.py
```

### Method 2: Direct Flask
```bash
python3 app.py
```

### Method 3: Using npm (if you have Node.js)
```bash
npm run dev
```

The application will be available at: http://localhost:3000

## File Structure

- `app.py` - Main Flask application with all routes and monitoring logic
- `backup_monitor.py` - Failsafe monitoring system that runs independently
- `start_python.py` - Simple startup script
- `templates/` - HTML templates for the web interface
  - `base.html` - Base template with common layout
  - `dashboard.html` - Main dashboard page
  - `raspberry_pi.html` - Raspberry Pi setup page
- `raspberry-pi/` - Raspberry Pi monitoring agent
  - `monitor.py` - Pi monitoring script
  - `install.sh` - Installation script for Pi nodes
- `netmonitor.db` - SQLite database for storing monitoring data

## System Requirements

- Python 3.11+
- Flask
- psutil (for system monitoring)
- requests (for HTTP operations)

## Features Overview

### Dashboard
- Real-time system statistics
- Network interface monitoring
- Device status overview
- Performance charts

### Raspberry Pi Setup
- Remote monitoring node configuration
- Automatic installation scripts
- Distributed monitoring capabilities

### Monitoring Architecture

1. **Primary**: Raspberry Pi nodes when available
2. **Secondary**: Host-based monitoring using psutil
3. **Backup**: Independent backup_monitor.py script
4. **Failsafe**: Basic system calls for critical data

## Network Monitoring

The system automatically discovers and monitors:
- Network devices on local subnet
- Router and gateway status
- Network interface statistics
- Connectivity status with multiple ping methods

## Development

The application uses:
- Flask web framework
- SQLite database
- HTML templates with Tailwind CSS
- Chart.js for visualizations
- Real-time updates via JavaScript

## Notes

- The application runs on port 3000 by default
- Includes automatic database initialization
- Supports both development and production modes
- Ping functionality may require system-level ping command installation

## License

MIT License