import React, { useState, useReducer, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, TrendingUp, Users, Globe, DollarSign } from 'lucide-react';

interface DashboardMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface DashboardState {
  selectedDatasets: string[];
  timeRange: { start: number; end: number };
  metrics: DashboardMetric[];
  polygonCount: number;
  isLoading: boolean;
}

interface DashboardAction {
  type: 'SET_TIME_RANGE' | 'ADD_DATASET' | 'REMOVE_DATASET' | 'UPDATE_METRICS' | 'SET_LOADING' | 'INCREMENT_POLYGONS';
  payload?: any;
}

const initialState: DashboardState = {
  selectedDatasets: ['temperature_2m'],
  timeRange: { start: 360, end: 384 },
  metrics: [
    {
      id: 'total-regions',
      title: 'Total Regions',
      value: '0',
      change: '+0%',
      trend: 'neutral',
      icon: <Globe className="h-4 w-4" />,
      color: 'chart-1'
    },
    {
      id: 'avg-temp',
      title: 'Avg Temperature',
      value: '--°C',
      change: '--',
      trend: 'neutral',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'chart-2'
    },
    {
      id: 'data-points',
      title: 'Data Points',
      value: '0',
      change: '--',
      trend: 'neutral',
      icon: <BarChart3 className="h-4 w-4" />,
      color: 'chart-3'
    },
    {
      id: 'active-sources',
      title: 'Active Sources',
      value: '1',
      change: '+0%',
      trend: 'neutral',
      icon: <DollarSign className="h-4 w-4" />,
      color: 'chart-4'
    }
  ],
  polygonCount: 0,
  isLoading: false
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_TIME_RANGE':
      return {
        ...state,
        timeRange: action.payload
      };
    case 'ADD_DATASET':
      return {
        ...state,
        selectedDatasets: [...state.selectedDatasets, action.payload]
      };
    case 'REMOVE_DATASET':
      return {
        ...state,
        selectedDatasets: state.selectedDatasets.filter(ds => ds !== action.payload)
      };
    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'INCREMENT_POLYGONS':
      const newCount = state.polygonCount + 1;
      const updatedMetrics = state.metrics.map(metric => 
        metric.id === 'total-regions' 
          ? { ...metric, value: newCount.toString(), change: `+${newCount}` }
          : metric
      );
      return {
        ...state,
        polygonCount: newCount,
        metrics: updatedMetrics
      };
    default:
      return state;
  }
}

interface DashboardMetricsProps {
  onPolygonCreate?: () => void;
  timeRange: { start: number; end: number };
  className?: string;
}

export function DashboardMetrics({ onPolygonCreate, timeRange, className }: DashboardMetricsProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const handleTokenSubmit = useCallback(() => {
    if (mapboxToken.trim()) {
      setShowTokenInput(false);
      // Here you would typically set the token for Mapbox usage
      localStorage.setItem('mapboxToken', mapboxToken);
    }
  }, [mapboxToken]);

  const simulateDataUpdate = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    setTimeout(() => {
      const hours = timeRange.end - timeRange.start;
      const avgTemp = 15 + Math.random() * 10;
      const dataPoints = hours * state.polygonCount;
      
      const updatedMetrics = state.metrics.map(metric => {
        switch (metric.id) {
          case 'avg-temp':
            return {
              ...metric,
              value: `${avgTemp.toFixed(1)}°C`,
              change: `${(Math.random() * 4 - 2).toFixed(1)}°C`,
              trend: Math.random() > 0.5 ? 'up' : 'down'
            };
          case 'data-points':
            return {
              ...metric,
              value: dataPoints.toString(),
              change: `${hours}h range`,
              trend: 'neutral'
            };
          default:
            return metric;
        }
      });
      
      dispatch({ type: 'UPDATE_METRICS', payload: updatedMetrics });
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 1000);
  }, [timeRange, state.polygonCount, state.metrics]);

  React.useEffect(() => {
    if (state.polygonCount > 0) {
      simulateDataUpdate();
    }
  }, [timeRange, simulateDataUpdate, state.polygonCount]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Mapbox Token Input */}
      {showTokenInput && (
        <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mapbox Configuration</h3>
              <Badge variant="secondary">Required</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              To fully enable map functionality, please provide your Mapbox public token.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <div className="flex space-x-2">
                <Input
                  id="mapbox-token"
                  type="password"
                  placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTokenSubmit} disabled={!mapboxToken.trim()}>
                  Apply
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your token at{' '}
              <a 
                href="https://mapbox.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </Card>
      )}

      {/* Dashboard Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.metrics.map((metric) => (
          <Card key={metric.id} className="p-6 bg-gradient-card border-border/50 shadow-card hover:shadow-elevated transition-all duration-300">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
              <div className={`p-2 rounded-lg bg-${metric.color}/10`}>
                <div className={`text-${metric.color}`}>
                  {metric.icon}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {state.isLoading ? (
                  <div className="animate-pulse bg-muted h-6 w-16 rounded" />
                ) : (
                  metric.value
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className={`inline-flex items-center text-xs ${
                  metric.trend === 'up' ? 'text-green-500' : 
                  metric.trend === 'down' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {metric.trend === 'up' && '↗'}
                  {metric.trend === 'down' && '↘'}
                  {metric.change}
                </span>
                <span className="ml-1">vs prev period</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Data Sources Status */}
      <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Data Sources</h3>
            <Badge variant="outline" className="text-primary border-primary/20">
              {state.selectedDatasets.length} sources
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.selectedDatasets.map((dataset) => (
              <Badge key={dataset} variant="secondary" className="capitalize">
                {dataset.replace('_', ' ')}
              </Badge>
            ))}
          </div>
          <Separator />
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• Time Range: {Math.floor((timeRange.end - timeRange.start) / 24)} days</div>
            <div>• Polygons: {state.polygonCount} regions</div>
            <div>• Integration: Open-Meteo API</div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => dispatch({ type: 'INCREMENT_POLYGONS' })}
            >
              <Globe className="h-4 w-4 mr-2" />
              Add Test Polygon
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={simulateDataUpdate}
              disabled={state.isLoading}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {state.isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}