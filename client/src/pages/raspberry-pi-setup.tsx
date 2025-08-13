import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Router, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  ExternalLink,
  Terminal,
  Activity,
  Thermometer,
  HardDrive,
  MemoryStick,
  Cpu,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RaspberryPiNode } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function RaspberryPiSetup() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: piNodes = [] } = useQuery<RaspberryPiNode[]>({
    queryKey: ['/api/raspberry-pi'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'pi_heartbeat' || message.type === 'pi_node_added') {
      queryClient.invalidateQueries({ queryKey: ['/api/raspberry-pi'] });
    }
  });

  const activeNodes = piNodes.filter(node => node.status === 'online');
  const warningNodes = piNodes.filter(node => node.status === 'warning');
  const offlineNodes = piNodes.filter(node => node.status === 'offline');

  const installScript = `curl -sSL ${window.location.origin}/install.sh | bash`;
  const downloadUrl = `${window.location.origin}/install.sh`;

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${description} copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-success text-white">Online</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning">Warning</Badge>;
      default:
        return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const formatUptime = (lastHeartbeat: Date | null) => {
    if (!lastHeartbeat) return "Unknown";
    const now = new Date();
    const diff = now.getTime() - new Date(lastHeartbeat).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const selectedNodeData = selectedNode ? piNodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <Router className="text-red-600 mr-3 h-6 w-6" />
              Raspberry Pi Network Monitoring Setup
            </h2>
            <p className="text-sm text-muted-foreground">Configure and manage distributed monitoring nodes</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              <span className="text-muted-foreground">
                WebSocket: <span className={isConnected ? 'text-success' : 'text-destructive'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Nodes</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-nodes">
                    {piNodes.length}
                  </p>
                </div>
                <Router className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-3xl font-bold text-success" data-testid="text-online-nodes">
                    {activeNodes.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Warning</p>
                  <p className="text-3xl font-bold text-warning" data-testid="text-warning-nodes">
                    {warningNodes.length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-3xl font-bold text-destructive" data-testid="text-offline-nodes">
                    {offlineNodes.length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-destructive"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Installation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="text-primary mr-3 h-5 w-5" />
                Quick Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="automatic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="automatic">Automatic Install</TabsTrigger>
                  <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                </TabsList>
                
                <TabsContent value="automatic" className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      One-Command Installation
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Run this command on your Raspberry Pi to automatically install and configure the monitoring agent:
                    </p>
                    <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                      <code data-testid="text-install-command">{installScript}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                        onClick={() => copyToClipboard(installScript, "Installation command")}
                        data-testid="button-copy-install"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">What this script does:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Updates system packages</li>
                      <li>• Installs Python 3 and required dependencies</li>
                      <li>• Downloads the monitoring script</li>
                      <li>• Creates a systemd service for auto-start</li>
                      <li>• Configures the agent to connect to this server</li>
                    </ul>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(downloadUrl, '_blank')}
                      data-testid="button-download-script"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Script
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/monitor.py', '_blank')}
                      data-testid="button-view-monitor"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Monitor Script
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Step 1: Install Dependencies</h4>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                        <code>sudo apt-get update && sudo apt-get install -y python3 python3-pip</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard("sudo apt-get update && sudo apt-get install -y python3 python3-pip", "Dependencies command")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Step 2: Install Python Packages</h4>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                        <code>sudo pip3 install requests psutil</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard("sudo pip3 install requests psutil", "Python packages command")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Step 3: Download Monitor Script</h4>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                        <code>curl -sSL {window.location.origin}/monitor.py -o monitor.py</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard(`curl -sSL ${window.location.origin}/monitor.py -o monitor.py`, "Download command")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Step 4: Set Environment Variables</h4>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                        <code>export NETMONITOR_SERVER={window.location.origin}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard(`export NETMONITOR_SERVER=${window.location.origin}`, "Environment variable")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Step 5: Run the Monitor</h4>
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
                        <code>python3 monitor.py</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                          onClick={() => copyToClipboard("python3 monitor.py", "Run command")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Node List */}
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {piNodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Router className="mx-auto h-12 w-12 text-muted mb-4" />
                    <p className="font-medium">No nodes configured yet</p>
                    <p className="text-sm">Install the agent on a Raspberry Pi to get started</p>
                  </div>
                ) : (
                  piNodes.map((node) => (
                    <div 
                      key={node.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedNode === node.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                      data-testid={`card-node-${node.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(node.status)}
                          <div>
                            <h4 className="font-medium text-foreground" data-testid={`text-node-name-${node.id}`}>
                              {node.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">{node.ipAddress}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(node.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatUptime(node.lastHeartbeat)}
                          </p>
                        </div>
                      </div>

                      {selectedNode === node.id && selectedNodeData && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <Cpu className="mr-1 h-3 w-3" />
                                  CPU Usage
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedNodeData.cpuUsage?.toFixed(1) || 0}%
                                </span>
                              </div>
                              <Progress value={selectedNodeData.cpuUsage || 0} className="h-2" />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <MemoryStick className="mr-1 h-3 w-3" />
                                  Memory
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedNodeData.memoryUsage?.toFixed(1) || 0}%
                                </span>
                              </div>
                              <Progress value={selectedNodeData.memoryUsage || 0} className="h-2" />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <HardDrive className="mr-1 h-3 w-3" />
                                  Disk Usage
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedNodeData.diskUsage?.toFixed(1) || 0}%
                                </span>
                              </div>
                              <Progress value={selectedNodeData.diskUsage || 0} className="h-2" />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center">
                                  <Thermometer className="mr-1 h-3 w-3" />
                                  Temperature
                                </span>
                                <span className="text-sm font-medium">
                                  {selectedNodeData.temperature?.toFixed(1) || '--'}°C
                                </span>
                              </div>
                              <div className="h-2 bg-secondary rounded-full">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    (selectedNodeData.temperature || 0) > 70 
                                      ? 'bg-destructive' 
                                      : (selectedNodeData.temperature || 0) > 60 
                                        ? 'bg-warning' 
                                        : 'bg-success'
                                  }`}
                                  style={{ width: `${Math.min((selectedNodeData.temperature || 0) / 80 * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 text-xs text-muted-foreground">
                            <p>Version: {selectedNodeData.version || 'Unknown'}</p>
                            <p>Last Heartbeat: {selectedNodeData.lastHeartbeat 
                              ? new Date(selectedNodeData.lastHeartbeat).toLocaleString() 
                              : 'Never'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Common Issues</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-destructive">Node shows as offline</p>
                    <p className="text-xs text-muted-foreground">Check network connectivity and firewall settings</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warning">High CPU/Memory usage</p>
                    <p className="text-xs text-muted-foreground">Consider increasing monitoring intervals</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warning">Temperature warnings</p>
                    <p className="text-xs text-muted-foreground">Check cooling and ventilation</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Service Commands</h4>
                <div className="space-y-2 text-sm font-mono">
                  <p className="text-muted-foreground"># Check service status</p>
                  <p>sudo systemctl status netmonitor</p>
                  <p className="text-muted-foreground"># View logs</p>
                  <p>sudo journalctl -u netmonitor -f</p>
                  <p className="text-muted-foreground"># Restart service</p>
                  <p>sudo systemctl restart netmonitor</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}