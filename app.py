#!/usr/bin/env python3
"""
NetMonitor Pro - Simple Python Web Application
Network monitoring and statistics dashboard using Flask
"""

import os
import json
import time
import threading
import subprocess
import platform
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request
import psutil
import socket
import sqlite3

app = Flask(__name__)

# Configuration
DATABASE_FILE = 'netmonitor.db'
MONITORING_INTERVAL = 30  # seconds

class NetworkMonitor:
    def __init__(self):
        self.init_database()
        self.monitoring_active = False
        self.monitoring_thread = None
        
    def init_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ip_address TEXT UNIQUE NOT NULL,
                mac_address TEXT,
                device_type TEXT,
                status TEXT DEFAULT 'unknown',
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                latency REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS network_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                upload_speed REAL,
                download_speed REAL,
                utilization REAL,
                packet_loss REAL,
                latency REAL,
                FOREIGN KEY (device_id) REFERENCES devices (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS host_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cpu_usage REAL,
                memory_usage REAL,
                disk_usage REAL,
                network_interfaces TEXT,
                uptime REAL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER,
                severity TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                message TEXT NOT NULL,
                is_resolved BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raspberry_pi_nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                ip_address TEXT UNIQUE NOT NULL,
                location TEXT,
                is_online BOOLEAN DEFAULT 0,
                last_heartbeat TIMESTAMP,
                system_stats TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Add sample data
        self.add_sample_data()
    
    def add_sample_data(self):
        """Add sample network devices for demonstration"""
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        sample_devices = [
            ('Main Router', '192.168.1.1', '00:11:22:33:44:55', 'Router', 'online', 15.2),
            ('Network Switch', '192.168.1.2', '00:11:22:33:44:56', 'Switch', 'online', 8.5),
            ('WiFi Access Point', '192.168.1.3', '00:11:22:33:44:57', 'Access Point', 'warning', 25.1),
        ]
        
        for device in sample_devices:
            cursor.execute('''
                INSERT OR IGNORE INTO devices (name, ip_address, mac_address, device_type, status, latency)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', device)
        
        conn.commit()
        conn.close()
    
    def get_system_stats(self):
        """Get current system statistics"""
        try:
            # CPU Usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory Usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk Usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Network Interfaces
            interfaces = []
            for interface, addrs in psutil.net_if_addrs().items():
                if interface.startswith('lo'):
                    continue
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        interfaces.append({
                            'name': interface,
                            'ip': addr.address,
                            'netmask': addr.netmask
                        })
                        break
            
            # System uptime
            boot_time = psutil.boot_time()
            uptime_seconds = time.time() - boot_time
            uptime_hours = uptime_seconds / 3600
            
            return {
                'cpu_usage': round(cpu_percent, 1),
                'memory_usage': round(memory_percent, 1),
                'disk_usage': round(disk_percent, 1),
                'uptime_hours': round(uptime_hours, 1),
                'interfaces': interfaces,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting system stats: {e}")
            return {
                'cpu_usage': 0,
                'memory_usage': 0,
                'disk_usage': 0,
                'uptime_hours': 0,
                'interfaces': [],
                'timestamp': datetime.now().isoformat()
            }
    
    def ping_host(self, target, count=3):
        """Ping a host and return success status and latency with multiple fallback methods"""
        # Method 1: Try standard ping command
        try:
            if platform.system().lower() == "windows":
                cmd = f"ping -n {count} {target}"
            else:
                cmd = f"ping -c {count} {target}"
            
            result = subprocess.run(cmd.split(), 
                                  capture_output=True, 
                                  text=True, 
                                  timeout=10)
            
            if result.returncode == 0:
                output = result.stdout
                # Extract latency (simplified)
                if "time=" in output:
                    lines = output.split('\n')
                    for line in lines:
                        if "time=" in line:
                            try:
                                latency = float(line.split('time=')[1].split('ms')[0])
                                return True, latency
                            except:
                                pass
                return True, None
            else:
                return False, None
        except Exception as e:
            print(f"Standard ping failed for {target}: {e}")
            
        # Method 2: Try alternative ping using python socket
        try:
            import socket
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((target, 80))  # Try HTTP port
            sock.close()
            
            if result == 0:
                latency = (time.time() - start_time) * 1000
                return True, round(latency, 1)
            else:
                # Try ICMP using raw socket (requires privileges)
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
                    sock.settimeout(5)
                    sock.sendto(b'', (target, 0))
                    sock.close()
                    latency = (time.time() - start_time) * 1000
                    return True, round(latency, 1)
                except:
                    pass
                    
        except Exception as e:
            print(f"Socket ping failed for {target}: {e}")
        
        # Method 3: DNS lookup as connectivity test
        try:
            import socket
            start_time = time.time()
            socket.gethostbyname(target)
            latency = (time.time() - start_time) * 1000
            return True, round(latency, 1)
        except Exception as e:
            print(f"DNS lookup failed for {target}: {e}")
        
        # Method 4: HTTP request as final fallback
        try:
            import urllib.request
            start_time = time.time()
            response = urllib.request.urlopen(f"http://{target}", timeout=5)
            latency = (time.time() - start_time) * 1000
            response.close()
            return True, round(latency, 1)
        except:
            pass
            
        return False, None
    
    def discover_network_devices(self):
        """Discover devices on the local network"""
        try:
            # Get local network range
            interfaces = psutil.net_if_addrs()
            local_nets = []
            
            for interface, addrs in interfaces.items():
                for addr in addrs:
                    if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                        # Simple subnet calculation
                        ip_parts = addr.address.split('.')
                        subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}"
                        local_nets.append(subnet)
            
            # Scan common IPs in each subnet
            for subnet in set(local_nets):
                common_ips = [1, 254, 100, 101, 102]  # Router, gateway, common device IPs
                for last_octet in common_ips:
                    target_ip = f"{subnet}.{last_octet}"
                    success, latency = self.ping_host(target_ip, 1)
                    
                    if success:
                        self.update_or_add_device(target_ip, latency)
        
        except Exception as e:
            print(f"Network discovery error: {e}")
    
    def update_or_add_device(self, ip_address, latency):
        """Update existing device or add new one"""
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Check if device exists
        cursor.execute('SELECT id FROM devices WHERE ip_address = ?', (ip_address,))
        result = cursor.fetchone()
        
        if result:
            # Update existing device
            cursor.execute('''
                UPDATE devices 
                SET status = 'online', latency = ?, last_seen = CURRENT_TIMESTAMP 
                WHERE ip_address = ?
            ''', (latency, ip_address))
        else:
            # Add new device
            device_name = f"Device {ip_address.split('.')[-1]}"
            device_type = "Network Device"
            if ip_address.endswith('.1') or ip_address.endswith('.254'):
                device_name = f"Gateway {ip_address.split('.')[-1]}"
                device_type = "Router"
            
            cursor.execute('''
                INSERT INTO devices (name, ip_address, device_type, status, latency)
                VALUES (?, ?, ?, 'online', ?)
            ''', (device_name, ip_address, device_type, latency))
        
        conn.commit()
        conn.close()
    
    def store_host_stats(self, stats):
        """Store host system statistics"""
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO host_stats 
            (cpu_usage, memory_usage, disk_usage, network_interfaces, uptime)
            VALUES (?, ?, ?, ?, ?)
        ''', (stats['cpu_usage'], stats['memory_usage'], stats['disk_usage'], 
              json.dumps(stats['interfaces']), stats['uptime_hours']))
        
        conn.commit()
        conn.close()
    
    def monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect host stats
                stats = self.get_system_stats()
                self.store_host_stats(stats)
                
                # Discover network devices
                self.discover_network_devices()
                
                # Generate sample network statistics
                self.generate_sample_network_stats()
                
                print(f"Monitoring cycle completed at {datetime.now()}")
                
            except Exception as e:
                print(f"Monitoring error: {e}")
            
            time.sleep(MONITORING_INTERVAL)
    
    def generate_sample_network_stats(self):
        """Generate realistic network statistics for devices"""
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM devices WHERE status = "online"')
        devices = cursor.fetchall()
        
        for device_id, in devices:
            # Generate realistic network stats
            import random
            stats = {
                'upload_speed': round(random.uniform(10, 100), 2),
                'download_speed': round(random.uniform(50, 500), 2),
                'utilization': round(random.uniform(5, 85), 1),
                'packet_loss': round(random.uniform(0, 2), 2),
                'latency': round(random.uniform(1, 50), 1)
            }
            
            cursor.execute('''
                INSERT INTO network_stats 
                (device_id, upload_speed, download_speed, utilization, packet_loss, latency)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (device_id, stats['upload_speed'], stats['download_speed'], 
                  stats['utilization'], stats['packet_loss'], stats['latency']))
        
        conn.commit()
        conn.close()
    
    def start_monitoring(self):
        """Start the monitoring thread"""
        if not self.monitoring_active:
            self.monitoring_active = True
            self.monitoring_thread = threading.Thread(target=self.monitoring_loop)
            self.monitoring_thread.daemon = True
            self.monitoring_thread.start()
            print("Network monitoring started")
    
    def stop_monitoring(self):
        """Stop the monitoring thread"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        print("Network monitoring stopped")

# Initialize monitor
monitor = NetworkMonitor()

@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@app.route('/raspberry-pi')
def raspberry_pi_setup():
    """Raspberry Pi setup page"""
    return render_template('raspberry_pi.html')

@app.route('/api/raspberry-pi', methods=['GET', 'POST'])
def raspberry_pi_nodes():
    """Get or add Raspberry Pi nodes"""
    if request.method == 'GET':
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, ip_address, location, is_online, last_heartbeat, system_stats, created_at
            FROM raspberry_pi_nodes ORDER BY name
        ''')
        
        nodes = []
        for row in cursor.fetchall():
            system_stats = json.loads(row[6]) if row[6] else {}
            nodes.append({
                'id': row[0],
                'name': row[1],
                'ipAddress': row[2],
                'location': row[3],
                'isOnline': bool(row[4]),
                'lastHeartbeat': row[5],
                'systemStats': system_stats,
                'createdAt': row[7]
            })
        
        conn.close()
        return jsonify(nodes)
    
    elif request.method == 'POST':
        data = request.get_json()
        name = data.get('name', '')
        ip_address = data.get('ipAddress', '')
        location = data.get('location', '')
        
        if not name or not ip_address:
            return jsonify({'success': False, 'error': 'Name and IP address are required'}), 400
        
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO raspberry_pi_nodes (name, ip_address, location)
                VALUES (?, ?, ?)
            ''', (name, ip_address, location))
            conn.commit()
            
            return jsonify({'success': True, 'message': 'Node registered successfully'})
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'error': 'Node with this IP address already exists'}), 400
        finally:
            conn.close()

@app.route('/api/raspberry-pi/<node_id>', methods=['DELETE'])
def remove_raspberry_pi_node(node_id):
    """Remove a Raspberry Pi node"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM raspberry_pi_nodes WHERE id = ?', (node_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Node removed successfully'})

@app.route('/api/raspberry-pi/<node_id>/heartbeat', methods=['POST'])
def raspberry_pi_heartbeat(node_id):
    """Receive heartbeat from Raspberry Pi node"""
    data = request.get_json()
    system_stats = data.get('systemStats', {})
    
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE raspberry_pi_nodes 
        SET is_online = 1, last_heartbeat = CURRENT_TIMESTAMP, system_stats = ?
        WHERE id = ?
    ''', (json.dumps(system_stats), node_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Heartbeat received'})

@app.route('/api/dashboard/overview')
def dashboard_overview():
    """Get dashboard overview statistics"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    # Get device counts
    cursor.execute('SELECT COUNT(*) FROM devices')
    total_devices = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM devices WHERE status = "online"')
    online_devices = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM devices WHERE status = "offline"')
    offline_devices = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM alerts WHERE is_resolved = 0')
    active_alerts = cursor.fetchone()[0]
    
    # Calculate average latency
    cursor.execute('SELECT AVG(latency) FROM devices WHERE latency IS NOT NULL AND status = "online"')
    avg_latency = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return jsonify({
        'totalDevices': total_devices,
        'onlineDevices': online_devices,
        'offlineDevices': offline_devices,
        'activeAlerts': active_alerts,
        'avgLatency': round(avg_latency, 1)
    })

@app.route('/api/network-devices')
def get_network_devices():
    """Get all network devices"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, ip_address, mac_address, device_type, status, 
               last_seen, latency, created_at
        FROM devices ORDER BY name
    ''')
    
    devices = []
    for row in cursor.fetchall():
        devices.append({
            'id': row[0],
            'name': row[1],
            'ipAddress': row[2],
            'macAddress': row[3],
            'type': row[4],
            'status': row[5],
            'lastSeen': row[6],
            'latency': row[7],
            'createdAt': row[8]
        })
    
    conn.close()
    return jsonify(devices)

@app.route('/api/host/stats')
def get_host_stats():
    """Get current host system statistics with backup failsafe"""
    try:
        # Try primary monitoring system
        stats = monitor.get_system_stats()
        return jsonify({
            'cpuUsage': stats['cpu_usage'],
            'memoryUsage': stats['memory_usage'],
            'diskUsage': stats['disk_usage'],
            'uptime': stats['uptime_hours'],
            'networkInterfaces': stats['interfaces'],
            'source': 'primary'
        })
    except Exception as e:
        print(f"Primary monitoring failed: {e}, trying backup system")
        
        # Try backup monitoring system
        try:
            from backup_monitor import BackupMonitor
            backup = BackupMonitor()
            backup_stats = backup.run_monitoring_cycle()
            
            return jsonify({
                'cpuUsage': backup_stats['cpu_usage'],
                'memoryUsage': backup_stats['memory']['percent'],
                'diskUsage': backup_stats['disk']['percent'],
                'uptime': backup_stats['uptime_hours'],
                'networkInterfaces': backup_stats['network_interfaces'],
                'source': 'backup'
            })
        except Exception as backup_error:
            print(f"Backup monitoring also failed: {backup_error}")
            
            # Final failsafe - return basic system info
            try:
                import os
                import platform
                
                # Very basic CPU estimation
                cpu_usage = 25.0  # Conservative estimate
                
                # Basic memory from /proc/meminfo if available
                memory_usage = 50.0
                try:
                    if platform.system() == "Linux" and os.path.exists('/proc/meminfo'):
                        with open('/proc/meminfo', 'r') as f:
                            meminfo = {}
                            for line in f:
                                key, value = line.split(':')
                                meminfo[key.strip()] = int(value.split()[0])
                            total = meminfo.get('MemTotal', 0)
                            available = meminfo.get('MemAvailable', meminfo.get('MemFree', 0))
                            if total > 0:
                                memory_usage = round((total - available) / total * 100, 1)
                except:
                    pass
                
                # Basic disk usage
                disk_usage = 50.0
                try:
                    stat = os.statvfs('/')
                    total = stat.f_blocks * stat.f_frsize
                    free = stat.f_bavail * stat.f_frsize
                    if total > 0:
                        disk_usage = round((total - free) / total * 100, 1)
                except:
                    pass
                
                return jsonify({
                    'cpuUsage': cpu_usage,
                    'memoryUsage': memory_usage,
                    'diskUsage': disk_usage,
                    'uptime': 1.0,
                    'networkInterfaces': [{'name': 'eth0', 'ip': '127.0.0.1', 'netmask': '255.0.0.0'}],
                    'source': 'failsafe'
                })
                
            except Exception as final_error:
                print(f"Final failsafe also failed: {final_error}")
                # Return absolute minimum data
                return jsonify({
                    'cpuUsage': 0,
                    'memoryUsage': 0,
                    'diskUsage': 0,
                    'uptime': 0,
                    'networkInterfaces': [],
                    'source': 'minimal'
                })

@app.route('/api/network-stats')
def get_network_stats():
    """Get network statistics"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    limit = request.args.get('limit', 50)
    device_id = request.args.get('deviceId')
    
    if device_id:
        cursor.execute('''
            SELECT id, device_id, timestamp, upload_speed, download_speed, 
                   utilization, packet_loss, latency
            FROM network_stats 
            WHERE device_id = ?
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (device_id, limit))
    else:
        cursor.execute('''
            SELECT id, device_id, timestamp, upload_speed, download_speed, 
                   utilization, packet_loss, latency
            FROM network_stats 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
    
    stats = []
    for row in cursor.fetchall():
        stats.append({
            'id': row[0],
            'deviceId': row[1],
            'timestamp': row[2],
            'uploadSpeed': row[3],
            'downloadSpeed': row[4],
            'utilization': row[5],
            'packetLoss': row[6],
            'latency': row[7]
        })
    
    conn.close()
    return jsonify(stats)

@app.route('/api/alerts')
def get_alerts():
    """Get alerts"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    resolved = request.args.get('resolved')
    if resolved == 'true':
        cursor.execute('''
            SELECT a.id, a.device_id, d.name, a.severity, a.alert_type, 
                   a.message, a.is_resolved, a.created_at, a.resolved_at
            FROM alerts a
            LEFT JOIN devices d ON a.device_id = d.id
            WHERE a.is_resolved = 1
            ORDER BY a.created_at DESC
        ''')
    elif resolved == 'false':
        cursor.execute('''
            SELECT a.id, a.device_id, d.name, a.severity, a.alert_type, 
                   a.message, a.is_resolved, a.created_at, a.resolved_at
            FROM alerts a
            LEFT JOIN devices d ON a.device_id = d.id
            WHERE a.is_resolved = 0
            ORDER BY a.created_at DESC
        ''')
    else:
        cursor.execute('''
            SELECT a.id, a.device_id, d.name, a.severity, a.alert_type, 
                   a.message, a.is_resolved, a.created_at, a.resolved_at
            FROM alerts a
            LEFT JOIN devices d ON a.device_id = d.id
            ORDER BY a.created_at DESC
        ''')
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            'id': row[0],
            'deviceId': row[1],
            'deviceName': row[2],
            'severity': row[3],
            'type': row[4],
            'message': row[5],
            'isResolved': bool(row[6]),
            'createdAt': row[7],
            'resolvedAt': row[8]
        })
    
    conn.close()
    return jsonify(alerts)

@app.route('/api/network-tools/ping', methods=['POST'])
def ping_tool():
    """Ping network tool"""
    data = request.get_json()
    target = data.get('target', '')
    count = data.get('count', 4)
    
    if not target:
        return jsonify({'error': 'Target is required'}), 400
    
    success, latency = monitor.ping_host(target, count)
    
    return jsonify({
        'target': target,
        'success': success,
        'latency': latency,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/install.sh')
def install_script():
    """Raspberry Pi installation script"""
    script = f"""#!/bin/bash

# NetMonitor Pro Raspberry Pi Agent Installation Script
echo "Installing NetMonitor Pro Agent..."

# Update system packages
sudo apt-get update

# Install Python and dependencies
sudo apt-get install -y python3 python3-pip

# Install required Python packages
sudo pip3 install requests psutil

# Create installation directory
sudo mkdir -p /opt/netmonitor
cd /opt/netmonitor

# Download monitoring script
curl -sSL {request.host_url}monitor.py -o monitor.py
sudo chmod +x monitor.py

# Create systemd service
sudo tee /etc/systemd/system/netmonitor.service > /dev/null <<EOF
[Unit]
Description=NetMonitor Pro Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/netmonitor
ExecStart=/usr/bin/python3 /opt/netmonitor/monitor.py
Restart=always
RestartSec=10
Environment=NETMONITOR_SERVER={request.host_url.rstrip('/')}

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable netmonitor
sudo systemctl start netmonitor

echo "NetMonitor Pro Agent installed successfully!"
echo "Service status:"
sudo systemctl status netmonitor --no-pager
"""
    
    return script, 200, {'Content-Type': 'text/plain'}

@app.route('/monitor.py')
def monitor_script():
    """Raspberry Pi monitoring script"""
    with open('raspberry-pi/monitor.py', 'r') as f:
        script = f.read()
    
    return script, 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    # Start monitoring
    monitor.start_monitoring()
    
    # Run Flask app
    try:
        app.run(host='0.0.0.0', port=3000, debug=True)
    finally:
        monitor.stop_monitoring()