import { 
  type NetworkDevice, 
  type InsertNetworkDevice,
  type NetworkStats,
  type InsertNetworkStats,
  type Alert,
  type InsertAlert,
  type RaspberryPiNode,
  type InsertRaspberryPiNode
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Network Devices
  getNetworkDevices(): Promise<NetworkDevice[]>;
  getNetworkDevice(id: string): Promise<NetworkDevice | undefined>;
  getNetworkDeviceByIp(ipAddress: string): Promise<NetworkDevice | undefined>;
  createNetworkDevice(device: InsertNetworkDevice): Promise<NetworkDevice>;
  updateNetworkDevice(id: string, device: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined>;
  deleteNetworkDevice(id: string): Promise<boolean>;

  // Network Stats
  getNetworkStats(deviceId?: string, limit?: number): Promise<NetworkStats[]>;
  createNetworkStats(stats: InsertNetworkStats): Promise<NetworkStats>;
  getLatestNetworkStats(): Promise<NetworkStats[]>;

  // Alerts
  getAlerts(isResolved?: boolean): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: string): Promise<boolean>;
  getActiveAlertsCount(): Promise<number>;

  // Raspberry Pi Nodes
  getRaspberryPiNodes(): Promise<RaspberryPiNode[]>;
  getRaspberryPiNode(id: string): Promise<RaspberryPiNode | undefined>;
  getRaspberryPiNodeByIp(ipAddress: string): Promise<RaspberryPiNode | undefined>;
  createRaspberryPiNode(node: InsertRaspberryPiNode): Promise<RaspberryPiNode>;
  updateRaspberryPiNode(id: string, node: Partial<InsertRaspberryPiNode>): Promise<RaspberryPiNode | undefined>;
  updateRaspberryPiHeartbeat(ipAddress: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private networkDevices: Map<string, NetworkDevice>;
  private networkStats: Map<string, NetworkStats>;
  private alerts: Map<string, Alert>;
  private raspberryPiNodes: Map<string, RaspberryPiNode>;

  constructor() {
    this.networkDevices = new Map();
    this.networkStats = new Map();
    this.alerts = new Map();
    this.raspberryPiNodes = new Map();
    
    // Initialize with some sample devices
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample network devices
    const devices: InsertNetworkDevice[] = [
      {
        name: "Main Router",
        type: "Cisco ISR 4331",
        ipAddress: "192.168.1.1",
        macAddress: "00:1A:2B:3C:4D:5E",
        status: "online",
        uptime: 99.8,
        latency: 8,
        location: "Server Room"
      },
      {
        name: "WiFi Access Point",
        type: "Ubiquiti UniFi AP",
        ipAddress: "192.168.1.10",
        macAddress: "00:1A:2B:3C:4D:5F",
        status: "warning",
        uptime: 97.2,
        latency: 15,
        location: "Office Floor 1"
      },
      {
        name: "File Server",
        type: "Dell PowerEdge",
        ipAddress: "192.168.1.100",
        macAddress: "00:1A:2B:3C:4D:60",
        status: "offline",
        uptime: 85.1,
        latency: null,
        location: "Data Center"
      }
    ];

    devices.forEach(device => {
      this.createNetworkDevice(device);
    });

    // Sample Raspberry Pi nodes
    const piNodes: InsertRaspberryPiNode[] = [
      {
        name: "pi-monitor-01",
        ipAddress: "192.168.1.201",
        status: "online",
        version: "1.0.0",
        cpuUsage: 25.5,
        memoryUsage: 45.2,
        diskUsage: 30.1,
        temperature: 42.5
      },
      {
        name: "pi-monitor-02",
        ipAddress: "192.168.1.202",
        status: "online",
        version: "1.0.0",
        cpuUsage: 18.3,
        memoryUsage: 38.7,
        diskUsage: 28.9,
        temperature: 39.2
      },
      {
        name: "pi-monitor-03",
        ipAddress: "192.168.1.203",
        status: "warning",
        version: "0.9.5",
        cpuUsage: 65.1,
        memoryUsage: 78.3,
        diskUsage: 85.5,
        temperature: 58.7
      }
    ];

    piNodes.forEach(node => {
      this.createRaspberryPiNode(node);
    });
  }

  // Network Devices
  async getNetworkDevices(): Promise<NetworkDevice[]> {
    return Array.from(this.networkDevices.values());
  }

  async getNetworkDevice(id: string): Promise<NetworkDevice | undefined> {
    return this.networkDevices.get(id);
  }

  async getNetworkDeviceByIp(ipAddress: string): Promise<NetworkDevice | undefined> {
    return Array.from(this.networkDevices.values()).find(device => device.ipAddress === ipAddress);
  }

  async createNetworkDevice(insertDevice: InsertNetworkDevice): Promise<NetworkDevice> {
    const id = randomUUID();
    const now = new Date();
    const device: NetworkDevice = {
      ...insertDevice,
      id,
      status: insertDevice.status || "unknown",
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    };
    this.networkDevices.set(id, device);
    return device;
  }

  async updateNetworkDevice(id: string, updateData: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined> {
    const device = this.networkDevices.get(id);
    if (!device) return undefined;

    const updatedDevice: NetworkDevice = {
      ...device,
      ...updateData,
      updatedAt: new Date(),
    };
    this.networkDevices.set(id, updatedDevice);
    return updatedDevice;
  }

  async deleteNetworkDevice(id: string): Promise<boolean> {
    return this.networkDevices.delete(id);
  }

  // Network Stats
  async getNetworkStats(deviceId?: string, limit: number = 100): Promise<NetworkStats[]> {
    let stats = Array.from(this.networkStats.values());
    if (deviceId) {
      stats = stats.filter(stat => stat.deviceId === deviceId);
    }
    return stats.slice(-limit);
  }

  async createNetworkStats(insertStats: InsertNetworkStats): Promise<NetworkStats> {
    const id = randomUUID();
    const stats: NetworkStats = {
      id,
      deviceId: insertStats.deviceId || null,
      timestamp: new Date(),
      uploadSpeed: insertStats.uploadSpeed || null,
      downloadSpeed: insertStats.downloadSpeed || null,
      utilization: insertStats.utilization || null,
      packetLoss: insertStats.packetLoss || null,
      latency: insertStats.latency || null,
    };
    this.networkStats.set(id, stats);
    return stats;
  }

  async getLatestNetworkStats(): Promise<NetworkStats[]> {
    const deviceStats = new Map<string, NetworkStats>();
    Array.from(this.networkStats.values()).forEach(stat => {
      if (stat.deviceId && stat.timestamp) {
        const existing = deviceStats.get(stat.deviceId);
        if (!existing || (existing.timestamp && stat.timestamp > existing.timestamp)) {
          deviceStats.set(stat.deviceId, stat);
        }
      }
    });
    return Array.from(deviceStats.values());
  }

  // Alerts
  async getAlerts(isResolved?: boolean): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values());
    if (isResolved !== undefined) {
      alerts = alerts.filter(alert => alert.isResolved === isResolved);
    }
    return alerts.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      id,
      deviceId: insertAlert.deviceId || null,
      severity: insertAlert.severity,
      type: insertAlert.type,
      message: insertAlert.message,
      isResolved: false,
      createdAt: new Date(),
      resolvedAt: null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async resolveAlert(id: string): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    const resolvedAlert: Alert = {
      ...alert,
      isResolved: true,
      resolvedAt: new Date(),
    };
    this.alerts.set(id, resolvedAlert);
    return true;
  }

  async getActiveAlertsCount(): Promise<number> {
    return Array.from(this.alerts.values()).filter(alert => !alert.isResolved).length;
  }

  // Raspberry Pi Nodes
  async getRaspberryPiNodes(): Promise<RaspberryPiNode[]> {
    return Array.from(this.raspberryPiNodes.values());
  }

  async getRaspberryPiNode(id: string): Promise<RaspberryPiNode | undefined> {
    return this.raspberryPiNodes.get(id);
  }

  async getRaspberryPiNodeByIp(ipAddress: string): Promise<RaspberryPiNode | undefined> {
    return Array.from(this.raspberryPiNodes.values()).find(node => node.ipAddress === ipAddress);
  }

  async createRaspberryPiNode(insertNode: InsertRaspberryPiNode): Promise<RaspberryPiNode> {
    const id = randomUUID();
    const node: RaspberryPiNode = {
      ...insertNode,
      id,
      lastHeartbeat: new Date(),
      createdAt: new Date(),
    };
    this.raspberryPiNodes.set(id, node);
    return node;
  }

  async updateRaspberryPiNode(id: string, updateData: Partial<InsertRaspberryPiNode>): Promise<RaspberryPiNode | undefined> {
    const node = this.raspberryPiNodes.get(id);
    if (!node) return undefined;

    const updatedNode: RaspberryPiNode = {
      ...node,
      ...updateData,
    };
    this.raspberryPiNodes.set(id, updatedNode);
    return updatedNode;
  }

  async updateRaspberryPiHeartbeat(ipAddress: string): Promise<boolean> {
    const node = await this.getRaspberryPiNodeByIp(ipAddress);
    if (!node) return false;

    const updatedNode: RaspberryPiNode = {
      ...node,
      lastHeartbeat: new Date(),
      status: "online",
    };
    this.raspberryPiNodes.set(node.id, updatedNode);
    return true;
  }
}

export const storage = new MemStorage();
