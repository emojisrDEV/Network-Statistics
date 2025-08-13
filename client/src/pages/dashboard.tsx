import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import Sidebar from "@/components/Sidebar";
import StatsOverview from "@/components/StatsOverview";
import NetworkTrafficChart from "@/components/NetworkTrafficChart";
import DeviceStatusChart from "@/components/DeviceStatusChart";
import DeviceList from "@/components/DeviceList";
import NetworkTools from "@/components/NetworkTools";
import RaspberryPiSetup from "@/components/RaspberryPiSetup";
import AlertsSection from "@/components/AlertsSection";
import { Wifi, Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: overview } = useQuery({
    queryKey: ['/api/dashboard/overview'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { isConnected } = useWebSocket((message) => {
    // Handle real-time WebSocket messages
    switch (message.type) {
      case 'device_added':
      case 'device_updated':
      case 'device_removed':
        queryClient.invalidateQueries({ queryKey: ['/api/network-devices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
        break;
      case 'alert_created':
      case 'alert_resolved':
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
        break;
      case 'pi_node_added':
      case 'pi_heartbeat':
        queryClient.invalidateQueries({ queryKey: ['/api/raspberry-pi'] });
        break;
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const networkStatus = overview && overview.onlineDevices > overview.offlineDevices ? 'Healthy' : 'Warning';
  const statusColor = networkStatus === 'Healthy' ? 'text-success' : 'text-warning';
  const statusDotColor = networkStatus === 'Healthy' ? 'bg-success' : 'bg-warning';

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-surface shadow-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Network Dashboard</h2>
              <p className="text-sm text-muted-foreground">Real-time network monitoring and management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${statusDotColor}`}></div>
                <span className="text-foreground">
                  Network Status: <span className={`font-medium ${statusColor}`}>{networkStatus}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}></div>
                <span className="text-muted-foreground">
                  WebSocket: <span className={isConnected ? 'text-success' : 'text-error'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <StatsOverview />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NetworkTrafficChart />
            <DeviceStatusChart />
          </div>

          <DeviceList />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NetworkTools />
            <RaspberryPiSetup />
          </div>

          <AlertsSection />
        </div>
      </main>
    </div>
  );
}
