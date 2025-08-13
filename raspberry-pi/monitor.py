#!/usr/bin/env python3
"""
NetMonitor Pro Raspberry Pi Monitoring Agent
Collects system metrics and sends them to the NetMonitor server
"""

import os
import sys
import time
import json
import socket
import requests
import psutil
from datetime import datetime
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/netmonitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NetMonitorAgent:
    def __init__(self):
        self.server_url = os.environ.get('NETMONITOR_SERVER', 'http://localhost:5000')
        self.node_name = os.environ.get('NETMONITOR_NAME', self.get_hostname())
        self.ip_address = self.get_local_ip()
        self.version = "1.0.0"
        self.heartbeat_interval = int(os.environ.get('HEARTBEAT_INTERVAL', '30'))  # seconds
        
        logger.info(f"NetMonitor Agent initialized")
        logger.info(f"Server URL: {self.server_url}")
        logger.info(f"Node Name: {self.node_name}")
        logger.info(f"IP Address: {self.ip_address}")
    
    def get_hostname(self):
        """Get the hostname of the system"""
        try:
            return socket.gethostname()
        except Exception as e:
            logger.error(f"Failed to get hostname: {e}")
            return f"pi-monitor-{self.get_local_ip().split('.')[-1]}"
    
    def get_local_ip(self):
        """Get the local IP address"""
        try:
            # Connect to a remote address to determine local IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception as e:
            logger.error(f"Failed to get local IP: {e}")
            return "127.0.0.1"
    
    def get_system_metrics(self):
        """Collect system metrics"""
        try:
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage = disk.percent
            
            # Temperature (Raspberry Pi specific)
            temperature = self.get_cpu_temperature()
            
            return {
                'cpuUsage': round(cpu_usage, 1),
                'memoryUsage': round(memory_usage, 1),
                'diskUsage': round(disk_usage, 1),
                'temperature': round(temperature, 1) if temperature else None
            }
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {
                'cpuUsage': 0,
                'memoryUsage': 0,
                'diskUsage': 0,
                'temperature': None
            }
    
    def get_cpu_temperature(self):
        """Get CPU temperature for Raspberry Pi"""
        try:
            # Try reading from thermal zone (most common)
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = float(f.read().strip()) / 1000.0
                return temp
        except FileNotFoundError:
            # Try vcgencmd (alternative method)
            try:
                result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    temp_str = result.stdout.strip()
                    # Extract temperature from "temp=XX.X'C"
                    temp = float(temp_str.split('=')[1].split("'")[0])
                    return temp
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError, 
                    FileNotFoundError, IndexError, ValueError):
                pass
        except Exception as e:
            logger.warning(f"Failed to read CPU temperature: {e}")
        
        return None
    
    def register_node(self):
        """Register this node with the server"""
        try:
            data = {
                'name': self.node_name,
                'ipAddress': self.ip_address,
                'status': 'online',
                'version': self.version
            }
            
            response = requests.post(
                f"{self.server_url}/api/raspberry-pi",
                json=data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info("Node registered successfully")
                return True
            else:
                logger.warning(f"Failed to register node: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to register node: {e}")
            return False
    
    def send_heartbeat(self):
        """Send heartbeat with system metrics to server"""
        try:
            metrics = self.get_system_metrics()
            data = {
                'ipAddress': self.ip_address,
                **metrics
            }
            
            response = requests.post(
                f"{self.server_url}/api/raspberry-pi/heartbeat",
                json=data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug("Heartbeat sent successfully")
                return True
            else:
                logger.warning(f"Failed to send heartbeat: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send heartbeat: {e}")
            return False
    
    def run_network_tests(self):
        """Run basic network connectivity tests"""
        tests = []
        
        # Test connectivity to gateway
        try:
            result = subprocess.run(['ping', '-c', '1', '-W', '2', '192.168.1.1'], 
                                  capture_output=True, timeout=5)
            gateway_reachable = result.returncode == 0
            tests.append({
                'name': 'Gateway Connectivity',
                'status': 'pass' if gateway_reachable else 'fail',
                'target': '192.168.1.1'
            })
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            tests.append({
                'name': 'Gateway Connectivity',
                'status': 'fail',
                'target': '192.168.1.1'
            })
        
        # Test internet connectivity
        try:
            result = subprocess.run(['ping', '-c', '1', '-W', '2', '8.8.8.8'], 
                                  capture_output=True, timeout=5)
            internet_reachable = result.returncode == 0
            tests.append({
                'name': 'Internet Connectivity',
                'status': 'pass' if internet_reachable else 'fail',
                'target': '8.8.8.8'
            })
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            tests.append({
                'name': 'Internet Connectivity',
                'status': 'fail',
                'target': '8.8.8.8'
            })
        
        return tests
    
    def run(self):
        """Main monitoring loop"""
        logger.info("Starting NetMonitor Agent...")
        
        # Register node on startup
        if not self.register_node():
            logger.error("Failed to register node, continuing anyway...")
        
        consecutive_failures = 0
        max_failures = 5
        
        while True:
            try:
                # Send heartbeat
                success = self.send_heartbeat()
                
                if success:
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    
                if consecutive_failures >= max_failures:
                    logger.error(f"Too many consecutive failures ({consecutive_failures}), "
                               f"will retry registration on next cycle")
                    consecutive_failures = 0
                    self.register_node()  # Try to re-register
                
                # Wait for next heartbeat
                time.sleep(self.heartbeat_interval)
                
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {e}")
                time.sleep(self.heartbeat_interval)
        
        logger.info("NetMonitor Agent stopped")

def main():
    """Main entry point"""
    try:
        agent = NetMonitorAgent()
        agent.run()
    except Exception as e:
        logger.error(f"Failed to start agent: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
