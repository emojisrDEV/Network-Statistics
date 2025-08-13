import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { NetworkTools } from "./services/networkTools";
import { 
  insertNetworkDeviceSchema,
  insertAlertSchema,
  insertRaspberryPiNodeSchema,
  pingRequestSchema,
  tracerouteRequestSchema,
  portScanRequestSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for real-time updates
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Network Devices API
  app.get("/api/network-devices", async (req, res) => {
    try {
      const devices = await storage.getNetworkDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network devices" });
    }
  });

  app.post("/api/network-devices", async (req, res) => {
    try {
      const deviceData = insertNetworkDeviceSchema.parse(req.body);
      const device = await storage.createNetworkDevice(deviceData);
      broadcast({ type: 'device_added', device });
      res.json(device);
    } catch (error) {
      res.status(400).json({ error: "Invalid device data" });
    }
  });

  app.put("/api/network-devices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertNetworkDeviceSchema.partial().parse(req.body);
      const device = await storage.updateNetworkDevice(id, updateData);
      
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      broadcast({ type: 'device_updated', device });
      res.json(device);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/network-devices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNetworkDevice(id);
      
      if (!success) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      broadcast({ type: 'device_removed', deviceId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  // Network Statistics API
  app.get("/api/network-stats", async (req, res) => {
    try {
      const { deviceId, limit } = req.query;
      const stats = await storage.getNetworkStats(
        deviceId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network statistics" });
    }
  });

  app.get("/api/network-stats/latest", async (req, res) => {
    try {
      const stats = await storage.getLatestNetworkStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest statistics" });
    }
  });

  // Dashboard Overview API
  app.get("/api/dashboard/overview", async (req, res) => {
    try {
      const devices = await storage.getNetworkDevices();
      const alerts = await storage.getAlerts(false); // Active alerts only
      const stats = await storage.getLatestNetworkStats();
      
      const totalDevices = devices.length;
      const onlineDevices = devices.filter(d => d.status === 'online').length;
      const offlineDevices = devices.filter(d => d.status === 'offline').length;
      const warningDevices = devices.filter(d => d.status === 'warning').length;
      
      // Calculate average utilization and latency
      const avgUtilization = stats.length > 0 
        ? stats.reduce((sum, s) => sum + (s.utilization || 0), 0) / stats.length
        : 0;
      
      const avgLatency = devices.filter(d => d.latency !== null)
        .reduce((sum, d, _, arr) => sum + (d.latency || 0) / arr.length, 0);

      const overview = {
        totalDevices,
        onlineDevices,
        offlineDevices,
        warningDevices,
        avgUtilization: Math.round(avgUtilization * 10) / 10,
        avgLatency: Math.round(avgLatency * 10) / 10,
        activeAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: alerts.filter(a => a.severity === 'warning').length,
      };
      
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
  });

  // Alerts API
  app.get("/api/alerts", async (req, res) => {
    try {
      const { resolved } = req.query;
      const isResolved = resolved === 'true' ? true : resolved === 'false' ? false : undefined;
      const alerts = await storage.getAlerts(isResolved);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      broadcast({ type: 'alert_created', alert });
      res.json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.put("/api/alerts/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.resolveAlert(id);
      
      if (!success) {
        return res.status(404).json({ error: "Alert not found" });
      }
      
      broadcast({ type: 'alert_resolved', alertId: id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Network Tools API
  app.post("/api/network-tools/ping", async (req, res) => {
    try {
      const { target, count } = pingRequestSchema.parse(req.body);
      const result = await NetworkTools.ping(target, count);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid ping request" });
    }
  });

  app.post("/api/network-tools/traceroute", async (req, res) => {
    try {
      const { target, maxHops } = tracerouteRequestSchema.parse(req.body);
      const result = await NetworkTools.traceroute(target, maxHops);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid traceroute request" });
    }
  });

  app.post("/api/network-tools/port-scan", async (req, res) => {
    try {
      const { target, startPort, endPort } = portScanRequestSchema.parse(req.body);
      const result = await NetworkTools.portScan(target, startPort, endPort);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid port scan request" });
    }
  });

  app.post("/api/network-tools/network-scan", async (req, res) => {
    try {
      const { subnet } = req.body;
      const activeHosts = await NetworkTools.networkScan(subnet);
      res.json({ activeHosts });
    } catch (error) {
      res.status(500).json({ error: "Network scan failed" });
    }
  });

  // Raspberry Pi Nodes API
  app.get("/api/raspberry-pi", async (req, res) => {
    try {
      const nodes = await storage.getRaspberryPiNodes();
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Raspberry Pi nodes" });
    }
  });

  app.post("/api/raspberry-pi", async (req, res) => {
    try {
      const nodeData = insertRaspberryPiNodeSchema.parse(req.body);
      const node = await storage.createRaspberryPiNode(nodeData);
      broadcast({ type: 'pi_node_added', node });
      res.json(node);
    } catch (error) {
      res.status(400).json({ error: "Invalid Raspberry Pi node data" });
    }
  });

  app.post("/api/raspberry-pi/heartbeat", async (req, res) => {
    try {
      const { ipAddress, cpuUsage, memoryUsage, diskUsage, temperature } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      const success = await storage.updateRaspberryPiHeartbeat(ipAddress);
      
      if (success) {
        // Update additional metrics if provided
        const node = await storage.getRaspberryPiNodeByIp(ipAddress);
        if (node && (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined || temperature !== undefined)) {
          await storage.updateRaspberryPiNode(node.id, {
            cpuUsage,
            memoryUsage,
            diskUsage,
            temperature
          });
        }
        
        broadcast({ type: 'pi_heartbeat', ipAddress, cpuUsage, memoryUsage, diskUsage, temperature });
      }
      
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to update heartbeat" });
    }
  });

  // Export Reports API
  app.get("/api/reports/devices", async (req, res) => {
    try {
      const devices = await storage.getNetworkDevices();
      const csvData = [
        ['Name', 'Type', 'IP Address', 'Status', 'Uptime', 'Latency', 'Location'],
        ...devices.map(d => [
          d.name,
          d.type,
          d.ipAddress,
          d.status,
          d.uptime?.toString() || '',
          d.latency?.toString() || '',
          d.location || ''
        ])
      ];
      
      const csv = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="network-devices.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export devices report" });
    }
  });

  app.get("/api/reports/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      const csvData = [
        ['Severity', 'Type', 'Message', 'Device ID', 'Created At', 'Resolved At', 'Status'],
        ...alerts.map(a => [
          a.severity,
          a.type,
          a.message,
          a.deviceId || '',
          a.createdAt.toISOString(),
          a.resolvedAt?.toISOString() || '',
          a.isResolved ? 'Resolved' : 'Active'
        ])
      ];
      
      const csv = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="network-alerts.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export alerts report" });
    }
  });

  // Installation script endpoint
  app.get("/install.sh", (req, res) => {
    const script = `#!/bin/bash
# NetMonitor Pro Raspberry Pi Installation Script

echo "Installing NetMonitor Pro Agent..."

# Create installation directory
sudo mkdir -p /opt/netmonitor
cd /opt/netmonitor

# Download monitoring script
sudo curl -sSL "${req.protocol}://${req.get('host')}/monitor.py" -o monitor.py
sudo chmod +x monitor.py

# Install Python dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip
sudo pip3 install requests psutil

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
Environment=NETMONITOR_SERVER=${req.protocol}://${req.get('host')}

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
`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
  });

  // Monitoring script endpoint
  app.get("/monitor.py", (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(__dirname + '/../../raspberry-pi/monitor.py');
  });

  return httpServer;
}
