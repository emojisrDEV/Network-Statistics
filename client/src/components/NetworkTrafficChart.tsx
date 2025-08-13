import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useState, useEffect } from "react";

export default function NetworkTrafficChart() {
  const [timeRange, setTimeRange] = useState<'live' | '1h' | '24h'>('live');
  const [chartData, setChartData] = useState<Array<{
    time: string;
    upload: number;
    download: number;
  }>>([]);

  const { data: networkStats } = useQuery({
    queryKey: ['/api/network-stats'],
    refetchInterval: 5000,
  });

  // Generate real-time mock data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      const now = new Date();
      const newData = [];
      
      for (let i = 19; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000); // Every minute for last 20 minutes
        newData.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          upload: Math.floor(Math.random() * 30) + 10,
          download: Math.floor(Math.random() * 40) + 60,
        });
      }
      
      setChartData(newData);
    };

    generateMockData();
    
    if (timeRange === 'live') {
      const interval = setInterval(() => {
        setChartData(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            upload: Math.floor(Math.random() * 30) + 10,
            download: Math.floor(Math.random() * 40) + 60,
          };
          
          return [...prev.slice(1), newPoint];
        });
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [timeRange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Network Traffic</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={timeRange === 'live' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('live')}
              data-testid="button-live"
            >
              Live
            </Button>
            <Button
              variant={timeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1h')}
              data-testid="button-1h"
            >
              1H
            </Button>
            <Button
              variant={timeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('24h')}
              data-testid="button-24h"
            >
              24H
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="time" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                label={{ value: 'Bandwidth (Mbps)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="upload"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Upload (Mbps)"
              />
              <Line
                type="monotone"
                dataKey="download"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Download (Mbps)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
