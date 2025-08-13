import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Activity,
  Thermometer,
  Clock,
  Network
} from "lucide-react";

interface HostSystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  networkInterfaces: Array<{
    name: string;
    ipAddress: string;
    isUp: boolean;
  }>;
}

export default function HostStatsCard() {
  const { data: hostStats, isLoading, error } = useQuery<HostSystemStats>({
    queryKey: ['/api/host/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Host System Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !hostStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Host System Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="mx-auto h-12 w-12 text-muted mb-4" />
            <p className="font-medium">Host monitoring unavailable</p>
            <p className="text-sm">Unable to collect system statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (value: number, thresholds: {warning: number, critical: number}) => {
    if (value >= thresholds.critical) return "text-destructive";
    if (value >= thresholds.warning) return "text-warning";
    return "text-success";
  };

  const getProgressColor = (value: number, thresholds: {warning: number, critical: number}) => {
    if (value >= thresholds.critical) return "bg-destructive";
    if (value >= thresholds.warning) return "bg-warning";
    return "bg-primary";
  };

  const formatUptime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  const activeInterfaces = hostStats.networkInterfaces.filter(iface => iface.isUp);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Host System Statistics
          </div>
          <Badge variant="outline" className="text-success border-success">
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              <Cpu className="mr-2 h-4 w-4" />
              CPU Usage
            </span>
            <span className={`text-sm font-bold ${getStatusColor(hostStats.cpuUsage, {warning: 70, critical: 90})}`}>
              {hostStats.cpuUsage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={hostStats.cpuUsage} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(hostStats.cpuUsage, {warning: 70, critical: 90})}`}
              style={{ width: `${Math.min(hostStats.cpuUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              <MemoryStick className="mr-2 h-4 w-4" />
              Memory Usage
            </span>
            <span className={`text-sm font-bold ${getStatusColor(hostStats.memoryUsage, {warning: 80, critical: 95})}`}>
              {hostStats.memoryUsage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={hostStats.memoryUsage} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(hostStats.memoryUsage, {warning: 80, critical: 95})}`}
              style={{ width: `${Math.min(hostStats.memoryUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Disk Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              <HardDrive className="mr-2 h-4 w-4" />
              Disk Usage
            </span>
            <span className={`text-sm font-bold ${getStatusColor(hostStats.diskUsage, {warning: 85, critical: 95})}`}>
              {hostStats.diskUsage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={hostStats.diskUsage} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(hostStats.diskUsage, {warning: 85, critical: 95})}`}
              style={{ width: `${Math.min(hostStats.diskUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* System Uptime */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            System Uptime
          </span>
          <span className="text-sm font-bold text-foreground">
            {formatUptime(hostStats.uptime)}
          </span>
        </div>

        {/* Network Interfaces */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              <Network className="mr-2 h-4 w-4" />
              Network Interfaces
            </span>
            <span className="text-sm font-bold text-foreground">
              {activeInterfaces.length} active
            </span>
          </div>
          
          <div className="space-y-1">
            {activeInterfaces.slice(0, 3).map((iface, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">{iface.name}</span>
                <span className="text-foreground font-mono">{iface.ipAddress}</span>
              </div>
            ))}
            {activeInterfaces.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{activeInterfaces.length - 3} more interfaces
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}