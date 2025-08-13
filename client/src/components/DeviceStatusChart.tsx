import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { MoreHorizontal } from "lucide-react";

export default function DeviceStatusChart() {
  const { data: overview } = useQuery({
    queryKey: ['/api/dashboard/overview'],
    refetchInterval: 30000,
  });

  if (!overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading device status...
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = [
    { name: 'Online', value: overview.onlineDevices, color: 'hsl(var(--chart-2))' },
    { name: 'Warning', value: overview.warningDevices, color: 'hsl(var(--chart-3))' },
    { name: 'Offline', value: overview.offlineDevices, color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Device Status Distribution</CardTitle>
          <Button variant="ghost" size="icon" data-testid="button-device-chart-options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value, percent }) => 
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
