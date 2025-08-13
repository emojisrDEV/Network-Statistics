import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface PingResult {
  success: boolean;
  output: string;
  packetLoss: number;
  avgLatency: number | null;
  error?: string;
}

export interface TracerouteResult {
  success: boolean;
  output: string;
  hops: Array<{
    hop: number;
    address: string;
    latency: number[];
  }>;
  error?: string;
}

export interface PortScanResult {
  success: boolean;
  openPorts: number[];
  closedPorts: number[];
  output: string;
  error?: string;
}

export class NetworkTools {
  static async ping(target: string, count: number = 4): Promise<PingResult> {
    try {
      const command = process.platform === "win32" 
        ? `ping -n ${count} ${target}`
        : `ping -c ${count} ${target}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stdout) {
        return {
          success: false,
          output: stderr,
          packetLoss: 100,
          avgLatency: null,
          error: stderr
        };
      }

      const output = stdout || stderr;
      
      // Parse packet loss
      const packetLossMatch = output.match(/(\d+)% packet loss/);
      const packetLoss = packetLossMatch ? parseInt(packetLossMatch[1]) : 0;
      
      // Parse average latency
      let avgLatency: number | null = null;
      if (process.platform === "win32") {
        const latencyMatch = output.match(/Average = (\d+)ms/);
        avgLatency = latencyMatch ? parseInt(latencyMatch[1]) : null;
      } else {
        const latencyMatch = output.match(/min\/avg\/max\/stddev = [\d.]+\/([\d.]+)/);
        avgLatency = latencyMatch ? parseFloat(latencyMatch[1]) : null;
      }

      return {
        success: packetLoss < 100,
        output,
        packetLoss,
        avgLatency,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        packetLoss: 100,
        avgLatency: null,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  static async traceroute(target: string, maxHops: number = 30): Promise<TracerouteResult> {
    try {
      const command = process.platform === "win32"
        ? `tracert -h ${maxHops} ${target}`
        : `traceroute -m ${maxHops} ${target}`;
      
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      
      if (stderr && !stdout) {
        return {
          success: false,
          output: stderr,
          hops: [],
          error: stderr
        };
      }

      const output = stdout || stderr;
      const hops: Array<{ hop: number; address: string; latency: number[] }> = [];
      
      // Parse traceroute output (simplified parsing)
      const lines = output.split('\n');
      for (const line of lines) {
        const hopMatch = line.match(/^\s*(\d+)\s+(.+)/);
        if (hopMatch) {
          const hopNumber = parseInt(hopMatch[1]);
          const hopData = hopMatch[2];
          
          // Extract IP/hostname and latencies
          const addressMatch = hopData.match(/([^\s]+\.[^\s]+)/);
          const latencyMatches = hopData.match(/(\d+(?:\.\d+)?)\s*ms/g);
          
          if (addressMatch) {
            const latencies = latencyMatches 
              ? latencyMatches.map(m => parseFloat(m.replace(' ms', '')))
              : [];
            
            hops.push({
              hop: hopNumber,
              address: addressMatch[1],
              latency: latencies
            });
          }
        }
      }

      return {
        success: true,
        output,
        hops
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        hops: [],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  static async portScan(target: string, startPort: number = 1, endPort: number = 1000): Promise<PortScanResult> {
    try {
      // Simple port scan using netcat or equivalent
      const openPorts: number[] = [];
      const closedPorts: number[] = [];
      let output = `Port scan results for ${target}:\n`;
      
      // Limit the scan to prevent overwhelming the system
      const maxPorts = Math.min(endPort - startPort + 1, 100);
      const actualEndPort = startPort + maxPorts - 1;
      
      for (let port = startPort; port <= actualEndPort; port++) {
        try {
          // Use netcat or telnet to test port connectivity
          const command = process.platform === "win32"
            ? `powershell "Test-NetConnection -ComputerName ${target} -Port ${port} -InformationLevel Quiet"`
            : `timeout 1 bash -c "</dev/tcp/${target}/${port}" 2>/dev/null && echo "open" || echo "closed"`;
          
          const { stdout } = await execAsync(command, { timeout: 2000 });
          
          if (stdout.trim() === "True" || stdout.trim() === "open") {
            openPorts.push(port);
            output += `Port ${port}: Open\n`;
          } else {
            closedPorts.push(port);
          }
        } catch {
          closedPorts.push(port);
        }
      }
      
      output += `\nScan complete. Found ${openPorts.length} open ports out of ${maxPorts} scanned.`;
      
      return {
        success: true,
        openPorts,
        closedPorts,
        output
      };
    } catch (error) {
      return {
        success: false,
        openPorts: [],
        closedPorts: [],
        output: "",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  static async networkScan(subnet: string = "192.168.1"): Promise<string[]> {
    try {
      const activeHosts: string[] = [];
      const promises: Promise<void>[] = [];
      
      // Scan first 50 IPs in the subnet to avoid overwhelming
      for (let i = 1; i <= 50; i++) {
        const ip = `${subnet}.${i}`;
        const promise = this.ping(ip, 1).then(result => {
          if (result.success && result.packetLoss < 100) {
            activeHosts.push(ip);
          }
        });
        promises.push(promise);
      }
      
      await Promise.all(promises);
      return activeHosts.sort((a, b) => {
        const aNum = parseInt(a.split('.').pop() || '0');
        const bNum = parseInt(b.split('.').pop() || '0');
        return aNum - bNum;
      });
    } catch (error) {
      console.error('Network scan error:', error);
      return [];
    }
  }
}
