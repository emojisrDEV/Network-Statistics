import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Route, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NetworkTools() {
  const [target, setTarget] = useState("192.168.1.1");
  const [output, setOutput] = useState("Ready to execute network commands...");
  const { toast } = useToast();

  const pingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/network-tools/ping', { 
        target,
        count: 4
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOutput(data.output);
      toast({
        title: "Ping completed",
        description: data.success ? `Success - ${data.avgLatency}ms avg` : "Failed to reach target",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      setOutput("Error: Failed to execute ping command");
      toast({
        title: "Ping failed",
        description: "Unable to execute ping command",
        variant: "destructive",
      });
    },
  });

  const tracerouteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/network-tools/traceroute', { 
        target,
        maxHops: 30
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOutput(data.output);
      toast({
        title: "Traceroute completed",
        description: data.success ? `Found ${data.hops.length} hops` : "Failed to complete traceroute",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      setOutput("Error: Failed to execute traceroute command");
      toast({
        title: "Traceroute failed",
        description: "Unable to execute traceroute command",
        variant: "destructive",
      });
    },
  });

  const portScanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/network-tools/port-scan', { 
        target,
        startPort: 1,
        endPort: 1000
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOutput(data.output);
      toast({
        title: "Port scan completed",
        description: data.success ? `Found ${data.openPorts.length} open ports` : "Port scan failed",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      setOutput("Error: Failed to execute port scan");
      toast({
        title: "Port scan failed", 
        description: "Unable to execute port scan",
        variant: "destructive",
      });
    },
  });

  const isLoading = pingMutation.isPending || tracerouteMutation.isPending || portScanMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Input
              placeholder="Enter IP address or hostname"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="flex-1"
              data-testid="input-target"
            />
            <Button
              onClick={() => pingMutation.mutate()}
              disabled={isLoading || !target.trim()}
              data-testid="button-ping"
            >
              <Activity className="mr-2 h-4 w-4" />
              Ping
            </Button>
          </div>
          
          <div className="flex space-x-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => tracerouteMutation.mutate()}
              disabled={isLoading || !target.trim()}
              data-testid="button-traceroute"
            >
              <Route className="mr-2 h-4 w-4" />
              Traceroute
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => portScanMutation.mutate()}
              disabled={isLoading || !target.trim()}
              data-testid="button-port-scan"
            >
              <Search className="mr-2 h-4 w-4" />
              Port Scan
            </Button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-40 overflow-y-auto">
            <div className="whitespace-pre-wrap" data-testid="text-output">
              {isLoading ? "Executing command..." : output}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
