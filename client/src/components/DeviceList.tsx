import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Router, 
  Wifi, 
  Server, 
  Plus, 
  RotateCcw, 
  Search, 
  Info, 
  Settings,
  Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NetworkDevice } from "@shared/schema";

const deviceIcons = {
  router: Router,
  switch: Router,
  'access point': Wifi,
  wifi: Wifi,
  server: Server,
  default: Server,
};

function getDeviceIcon(type: string) {
  const lowerType = type.toLowerCase();
  for (const [key, Icon] of Object.entries(deviceIcons)) {
    if (lowerType.includes(key)) {
      return Icon;
    }
  }
  return deviceIcons.default;
}

export default function DeviceList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: devices = [], isLoading } = useQuery<NetworkDevice[]>({
    queryKey: ['/api/network-devices'],
    refetchInterval: 30000,
  });

  const pingMutation = useMutation({
    mutationFn: async (target: string) => {
      const response = await apiRequest('POST', '/api/network-tools/ping', { target });
      return response.json();
    },
    onSuccess: (data, target) => {
      toast({
        title: "Ping completed",
        description: `${target}: ${data.success ? `${data.avgLatency}ms` : 'Failed'}`,
      });
    },
    onError: () => {
      toast({
        title: "Ping failed",
        description: "Unable to execute ping command",
        variant: "destructive",
      });
    },
  });

  const networkScanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/network-tools/network-scan', {
        subnet: '192.168.1'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/network-devices'] });
      toast({
        title: "Network scan completed",
        description: "Device list has been refreshed",
      });
    },
    onError: () => {
      toast({
        title: "Network scan failed",
        description: "Unable to scan network",
        variant: "destructive",
      });
    },
  });

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.ipAddress.includes(searchTerm) ||
                         device.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <Badge variant="outline" className="border-success text-success">
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Online
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <div className="w-2 h-2 bg-warning rounded-full mr-2"></div>
            Warning
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <div className="w-2 h-2 bg-destructive rounded-full mr-2"></div>
            Offline
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <div className="w-2 h-2 bg-muted rounded-full mr-2"></div>
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Network Devices</CardTitle>
          <div className="flex space-x-3">
            <Button 
              onClick={() => networkScanMutation.mutate()}
              disabled={networkScanMutation.isPending}
              data-testid="button-scan-network"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Scan Network
            </Button>
            <Button data-testid="button-add-device">
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-devices"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading devices...
                  </TableCell>
                </TableRow>
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {devices.length === 0 ? "No devices found" : "No devices match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.type);
                  
                  return (
                    <TableRow key={device.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                            <DeviceIcon className="text-primary h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground" data-testid={`text-device-name-${device.id}`}>
                              {device.name}
                            </div>
                            <div className="text-sm text-muted-foreground">{device.type}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm" data-testid={`text-device-ip-${device.id}`}>
                        {device.ipAddress}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(device.status)}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-device-latency-${device.id}`}>
                        {device.latency ? `${device.latency}ms` : '--'}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-device-uptime-${device.id}`}>
                        {device.uptime ? `${device.uptime}%` : '--'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => pingMutation.mutate(device.ipAddress)}
                            disabled={pingMutation.isPending || device.status === 'offline'}
                            data-testid={`button-ping-${device.id}`}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-info-${device.id}`}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-settings-${device.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
