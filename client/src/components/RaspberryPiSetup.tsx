import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Router, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RaspberryPiNode } from "@shared/schema";

export default function RaspberryPiSetup() {
  const { toast } = useToast();

  const { data: piNodes = [] } = useQuery<RaspberryPiNode[]>({
    queryKey: ['/api/raspberry-pi'],
    refetchInterval: 30000,
  });

  const activeNodes = piNodes.filter(node => node.status === 'online');
  const avgUptime = piNodes.length > 0 
    ? Math.round(piNodes.reduce((sum, node) => sum + 98, 0) / piNodes.length) // Mock uptime calculation
    : 0;

  const installScript = `curl -sSL ${window.location.origin}/install.sh | bash`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installScript);
      toast({
        title: "Script copied",
        description: "Installation script copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy script to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <div className="w-3 h-3 bg-success rounded-full"></div>;
      case 'warning':
        return <div className="w-3 h-3 bg-warning rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-destructive rounded-full"></div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Router className="text-red-600 mr-3 h-5 w-5" />
            Raspberry Pi Setup
          </CardTitle>
          <Badge variant={activeNodes.length > 0 ? "default" : "secondary"}>
            {activeNodes.length > 0 ? "Connected" : "No Nodes"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Installation Script</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Run this command on your Raspberry Pi to install the monitoring agent:
            </p>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm relative">
              <code data-testid="text-install-script">{installScript}</code>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white"
                onClick={copyToClipboard}
                data-testid="button-copy-script"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-success" data-testid="text-active-nodes">
                {activeNodes.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Pi Nodes</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary" data-testid="text-avg-uptime">
                {avgUptime}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Uptime</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {piNodes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No Raspberry Pi nodes configured
              </div>
            ) : (
              piNodes.map((node) => (
                <div 
                  key={node.id} 
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                  data-testid={`card-pi-node-${node.id}`}
                >
                  <div className="flex items-center">
                    {getStatusIcon(node.status)}
                    <span className="text-sm font-medium ml-3" data-testid={`text-pi-name-${node.id}`}>
                      {node.name}
                    </span>
                    {node.status === 'warning' && (
                      <AlertTriangle className="ml-2 h-4 w-4 text-warning" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground" data-testid={`text-pi-ip-${node.id}`}>
                    {node.ipAddress}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
