import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Server, 
  Table, 
  TrendingUp, 
  Wrench, 
  Bell, 
  Router, 
  FileDown,
  Wifi
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/devices", label: "Network Devices", icon: Server },
  { path: "/topology", label: "Network Topology", icon: Table },
  { path: "/statistics", label: "Statistics & Analytics", icon: TrendingUp },
  { path: "/tools", label: "Network Tools", icon: Wrench },
  { path: "/alerts", label: "Alerts & Monitoring", icon: Bell },
  { path: "/raspberry-pi", label: "Raspberry Pi Setup", icon: Router },
  { path: "/reports", label: "Export Reports", icon: FileDown },
];

export default function Sidebar() {
  const [location] = useLocation();

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  const activeAlerts = alerts?.filter((alert: any) => !alert.isResolved) || [];

  return (
    <aside className="w-64 bg-surface shadow-lg border-r border-border flex-shrink-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center">
          <Wifi className="text-primary mr-3 h-6 w-6" />
          NetMonitor Pro
        </h1>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/dashboard" && location === "/");
          
          return (
            <Link key={item.path} href={item.path}>
              <a 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
                {item.path === "/alerts" && activeAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {activeAlerts.length}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
