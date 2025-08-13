import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Server, TrendingUp, Clock, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['/api/dashboard/overview'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Unable to load overview data
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Devices</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-total-devices">
                {overview.totalDevices}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Server className="text-primary h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm space-x-4">
            <span className="text-success flex items-center">
              <ArrowUp className="mr-1 h-3 w-3" />
              {overview.onlineDevices} Online
            </span>
            <span className="text-destructive flex items-center">
              <ArrowDown className="mr-1 h-3 w-3" />
              {overview.offlineDevices} Offline
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Network Utilization</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-utilization">
                {overview.avgUtilization}%
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
              <TrendingUp className="text-warning h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-secondary rounded-full h-2">
              <div 
                className="bg-warning h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(overview.avgUtilization, 100)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Latency</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-latency">
                {overview.avgLatency}ms
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
              <Clock className="text-success h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-sm text-success">
            <ArrowDown className="inline mr-1 h-3 w-3" />
            Good performance
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-alerts">
                {overview.activeAlerts}
              </p>
            </div>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-destructive h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-sm text-destructive">
            <ArrowUp className="inline mr-1 h-3 w-3" />
            {overview.criticalAlerts} Critical, {overview.warningAlerts} Warning
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
