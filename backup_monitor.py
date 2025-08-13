#!/usr/bin/env python3
"""
Backup Network Monitor - Failsafe data collection system
This script runs independently and provides data collection when the main system fails
"""

import os
import json
import time
import sqlite3
import subprocess
import platform
from datetime import datetime
from pathlib import Path

class BackupMonitor:
    def __init__(self):
        self.db_file = 'backup_monitor.db'
        self.data_file = 'backup_data.json'
        self.init_backup_database()
        
    def init_backup_database(self):
        """Initialize backup SQLite database"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cpu_usage REAL,
                memory_total REAL,
                memory_used REAL,
                memory_percent REAL,
                disk_total REAL,
                disk_used REAL,
                disk_percent REAL,
                network_interfaces TEXT,
                uptime_seconds REAL,
                load_average TEXT,
                process_count INTEGER
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_network (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                interface_name TEXT,
                bytes_sent REAL,
                bytes_recv REAL,
                packets_sent REAL,
                packets_recv REAL,
                errors_in REAL,
                errors_out REAL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_cpu_usage_basic(self):
        """Get CPU usage using basic system commands"""
        try:
            if platform.system() == "Linux":
                # Use /proc/stat for CPU usage
                with open('/proc/stat', 'r') as f:
                    line = f.readline()
                    cpu_times = [int(x) for x in line.split()[1:]]
                    idle_time = cpu_times[3]
                    total_time = sum(cpu_times)
                    cpu_usage = 100 * (1 - idle_time / total_time)
                    return max(0, min(100, cpu_usage))
            else:
                # Fallback for other systems
                result = subprocess.run(['top', '-bn1'], capture_output=True, text=True, timeout=5)
                output = result.stdout
                for line in output.split('\n'):
                    if 'Cpu(s)' in line or '%Cpu' in line:
                        # Extract CPU usage from top output
                        parts = line.split()
                        for i, part in enumerate(parts):
                            if 'us' in part or 'user' in part:
                                try:
                                    return float(parts[i-1].replace('%', ''))
                                except:
                                    continue
        except Exception as e:
            print(f"CPU usage error: {e}")
            return 0
        
        return 0
    
    def get_memory_usage_basic(self):
        """Get memory usage using basic system commands"""
        try:
            if platform.system() == "Linux":
                # Use /proc/meminfo
                with open('/proc/meminfo', 'r') as f:
                    meminfo = {}
                    for line in f:
                        key, value = line.split(':')
                        meminfo[key.strip()] = int(value.split()[0]) * 1024  # Convert KB to bytes
                    
                    total = meminfo.get('MemTotal', 0)
                    available = meminfo.get('MemAvailable', meminfo.get('MemFree', 0))
                    used = total - available
                    percent = (used / total * 100) if total > 0 else 0
                    
                    return {
                        'total': total,
                        'used': used,
                        'percent': round(percent, 1)
                    }
            else:
                # Fallback using free command
                result = subprocess.run(['free', '-b'], capture_output=True, text=True, timeout=5)
                lines = result.stdout.split('\n')
                if len(lines) >= 2:
                    mem_line = lines[1].split()
                    total = int(mem_line[1])
                    used = int(mem_line[2])
                    percent = (used / total * 100) if total > 0 else 0
                    return {
                        'total': total,
                        'used': used,
                        'percent': round(percent, 1)
                    }
        except Exception as e:
            print(f"Memory usage error: {e}")
        
        return {'total': 0, 'used': 0, 'percent': 0}
    
    def get_disk_usage_basic(self):
        """Get disk usage using basic system commands"""
        try:
            if platform.system() == "Linux":
                # Use /proc/mounts and statvfs
                import os
                stat = os.statvfs('/')
                total = stat.f_blocks * stat.f_frsize
                free = stat.f_bavail * stat.f_frsize
                used = total - free
                percent = (used / total * 100) if total > 0 else 0
                
                return {
                    'total': total,
                    'used': used,
                    'percent': round(percent, 1)
                }
            else:
                # Fallback using df command
                result = subprocess.run(['df', '/'], capture_output=True, text=True, timeout=5)
                lines = result.stdout.split('\n')
                if len(lines) >= 2:
                    disk_line = lines[1].split()
                    total = int(disk_line[1]) * 1024  # Convert KB to bytes
                    used = int(disk_line[2]) * 1024
                    percent = float(disk_line[4].replace('%', ''))
                    return {
                        'total': total,
                        'used': used,
                        'percent': percent
                    }
        except Exception as e:
            print(f"Disk usage error: {e}")
        
        return {'total': 0, 'used': 0, 'percent': 0}
    
    def get_network_interfaces_basic(self):
        """Get network interfaces using basic system commands"""
        interfaces = []
        try:
            if platform.system() == "Linux":
                # Try ip command first
                try:
                    result = subprocess.run(['ip', 'addr', 'show'], capture_output=True, text=True, timeout=5)
                    output = result.stdout
                    current_interface = None
                    
                    for line in output.split('\n'):
                        line = line.strip()
                        if line and not line.startswith(' '):
                            # New interface line
                            parts = line.split()
                            if len(parts) >= 2:
                                interface_name = parts[1].rstrip(':')
                                if interface_name != 'lo':  # Skip loopback
                                    current_interface = interface_name
                        elif 'inet ' in line and current_interface:
                            # IP address line
                            parts = line.split()
                            ip_addr = parts[1].split('/')[0]
                            interfaces.append({
                                'name': current_interface,
                                'ip': ip_addr,
                                'netmask': '255.255.255.0'  # Default netmask
                            })
                            current_interface = None
                
                except:
                    # Fallback to ifconfig
                    result = subprocess.run(['ifconfig'], capture_output=True, text=True, timeout=5)
                    output = result.stdout
                    current_interface = None
                    
                    for line in output.split('\n'):
                        if line and not line.startswith(' ') and not line.startswith('\t'):
                            # New interface
                            interface_name = line.split()[0]
                            if interface_name != 'lo':
                                current_interface = interface_name
                        elif 'inet ' in line and current_interface:
                            parts = line.split()
                            for i, part in enumerate(parts):
                                if part == 'inet' and i + 1 < len(parts):
                                    ip_addr = parts[i + 1]
                                    interfaces.append({
                                        'name': current_interface,
                                        'ip': ip_addr,
                                        'netmask': '255.255.255.0'
                                    })
                                    current_interface = None
                                    break
        except Exception as e:
            print(f"Network interfaces error: {e}")
            # Ultimate fallback
            interfaces = [{
                'name': 'eth0',
                'ip': '127.0.0.1',
                'netmask': '255.0.0.0'
            }]
        
        return interfaces
    
    def get_system_uptime_basic(self):
        """Get system uptime using basic commands"""
        try:
            if platform.system() == "Linux":
                with open('/proc/uptime', 'r') as f:
                    uptime_seconds = float(f.readline().split()[0])
                    return uptime_seconds
            else:
                # Fallback using uptime command
                result = subprocess.run(['uptime'], capture_output=True, text=True, timeout=5)
                output = result.stdout
                # Parse uptime output (format varies by system)
                if 'day' in output:
                    # Extract days and hours
                    import re
                    match = re.search(r'(\d+)\s+day', output)
                    days = int(match.group(1)) if match else 0
                    match = re.search(r'(\d+):(\d+)', output)
                    if match:
                        hours = int(match.group(1))
                        minutes = int(match.group(2))
                        return days * 86400 + hours * 3600 + minutes * 60
                
                # Fallback - return estimated uptime
                return 3600  # 1 hour default
        except Exception as e:
            print(f"Uptime error: {e}")
            return 0
    
    def collect_system_stats(self):
        """Collect all system statistics using basic methods"""
        try:
            cpu_usage = self.get_cpu_usage_basic()
            memory_info = self.get_memory_usage_basic()
            disk_info = self.get_disk_usage_basic()
            network_interfaces = self.get_network_interfaces_basic()
            uptime_seconds = self.get_system_uptime_basic()
            
            # Get process count
            try:
                result = subprocess.run(['ps', 'aux'], capture_output=True, text=True, timeout=5)
                process_count = len(result.stdout.split('\n')) - 2  # Subtract header and empty line
            except:
                process_count = 50  # Default estimate
            
            # Get load average (Linux only)
            load_average = "0.0 0.0 0.0"
            try:
                if platform.system() == "Linux":
                    with open('/proc/loadavg', 'r') as f:
                        load_average = ' '.join(f.readline().split()[:3])
            except:
                pass
            
            stats = {
                'timestamp': datetime.now().isoformat(),
                'cpu_usage': cpu_usage,
                'memory': memory_info,
                'disk': disk_info,
                'network_interfaces': network_interfaces,
                'uptime_seconds': uptime_seconds,
                'uptime_hours': round(uptime_seconds / 3600, 1),
                'load_average': load_average,
                'process_count': process_count
            }
            
            return stats
            
        except Exception as e:
            print(f"Error collecting system stats: {e}")
            # Return minimal fallback data
            return {
                'timestamp': datetime.now().isoformat(),
                'cpu_usage': 0,
                'memory': {'total': 0, 'used': 0, 'percent': 0},
                'disk': {'total': 0, 'used': 0, 'percent': 0},
                'network_interfaces': [],
                'uptime_seconds': 0,
                'uptime_hours': 0,
                'load_average': "0.0 0.0 0.0",
                'process_count': 0
            }
    
    def store_backup_data(self, stats):
        """Store data in both database and JSON file"""
        try:
            # Store in database
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO backup_stats 
                (cpu_usage, memory_total, memory_used, memory_percent, 
                 disk_total, disk_used, disk_percent, network_interfaces, 
                 uptime_seconds, load_average, process_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                stats['cpu_usage'],
                stats['memory']['total'],
                stats['memory']['used'],
                stats['memory']['percent'],
                stats['disk']['total'],
                stats['disk']['used'],
                stats['disk']['percent'],
                json.dumps(stats['network_interfaces']),
                stats['uptime_seconds'],
                stats['load_average'],
                stats['process_count']
            ))
            
            conn.commit()
            conn.close()
            
            # Store in JSON file for easy access
            with open(self.data_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
            print(f"Backup data collected: CPU {stats['cpu_usage']}%, Memory {stats['memory']['percent']}%, Disk {stats['disk']['percent']}%")
            
        except Exception as e:
            print(f"Error storing backup data: {e}")
    
    def get_latest_backup_data(self):
        """Get the latest backup data"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error reading backup data: {e}")
        
        return None
    
    def cleanup_old_data(self, days=7):
        """Clean up old backup data"""
        try:
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM backup_stats 
                WHERE timestamp < datetime('now', '-{} days')
            '''.format(days))
            
            cursor.execute('''
                DELETE FROM backup_network 
                WHERE timestamp < datetime('now', '-{} days')
            '''.format(days))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error cleaning up old data: {e}")
    
    def run_monitoring_cycle(self):
        """Run a single monitoring cycle"""
        stats = self.collect_system_stats()
        self.store_backup_data(stats)
        return stats

def main():
    """Main backup monitoring loop"""
    monitor = BackupMonitor()
    
    print("🔄 Starting Backup Network Monitor")
    print("This provides failsafe data collection when the main system fails")
    print("-" * 60)
    
    cycle_count = 0
    
    try:
        while True:
            cycle_count += 1
            print(f"\nBackup Monitor Cycle {cycle_count} - {datetime.now().strftime('%H:%M:%S')}")
            
            stats = monitor.run_monitoring_cycle()
            
            # Clean up old data every 100 cycles
            if cycle_count % 100 == 0:
                monitor.cleanup_old_data()
                print("Cleaned up old backup data")
            
            # Wait 60 seconds between cycles
            time.sleep(60)
            
    except KeyboardInterrupt:
        print("\n\n✅ Backup monitor stopped")
    except Exception as e:
        print(f"\n❌ Backup monitor error: {e}")

if __name__ == "__main__":
    main()