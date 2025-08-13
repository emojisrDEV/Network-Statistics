import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, Eye, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Alert } from "@shared/schema";

export default function AlertsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PUT', `/api/alerts/${alertId}/resolve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
      toast({
        title: "Alert resolved",
        description: "Alert has been marked as resolved",
      });
    },
    onError: () => {
      toast({
        title: "Failed to resolve alert",
        description: "Unable to resolve alert",
        variant: "destructive",
      });
    },
  });

  const activeAlerts = alerts.filter(alert => !alert.isResolved);
  const recentAlerts = alerts.slice(0, 5); // Show 5 most recent alerts

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning">Warning</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAlertBackground = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-destructive bg-destructive/5';
      case 'warning':
        return 'border-warning bg-warning/5';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Alerts & Events</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-view-all-alerts"
          >
            View All Alerts
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <p>No alerts at this time</p>
              <p className="text-sm">Your network is running smoothly</p>
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start p-4 border rounded-lg ${getAlertBackground(alert.severity)}`}
                data-testid={`card-alert-${alert.id}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-4 bg-background">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-foreground" data-testid={`text-alert-message-${alert.id}`}>
                        {alert.message}
                      </h4>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <span className="text-sm text-muted-foreground flex-shrink-0" data-testid={`text-alert-time-${alert.id}`}>
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Type: {alert.type}
                  </p>
                  {!alert.isResolved && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-investigate-${alert.id}`}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Investigate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveAlertMutation.mutate(alert.id)}
                        disabled={resolveAlertMutation.isPending}
                        data-testid={`button-resolve-${alert.id}`}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Resolve
                      </Button>
                    </div>
                  )}
                  {alert.isResolved && (
                    <div className="flex items-center text-sm text-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Resolved
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
