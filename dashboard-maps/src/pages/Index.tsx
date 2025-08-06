import React, { useState, useCallback, useEffect } from 'react';
import { TimelineSlider } from '@/components/dashboard/TimelineSlider';
import { MapView } from '@/components/dashboard/MapView';
import { DataSourceSidebar } from '@/components/dashboard/DataSourceSidebar';
import { Badge } from '@/components/ui/badge';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { MobileControls } from '@/components/dashboard/MobileControls';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart3, Globe, MapPin } from 'lucide-react';

interface Polygon {
  id: string;
  name: string;
  coordinates: number[][];
  dataSource: string;
  color: string;
  value?: number;
}

const Index = () => {
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedPolygons, setSelectedPolygons] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState({ start: 360, end: 384 }); // Default 24-hour range
  const [isSingleTime, setIsSingleTime] = useState(false);
  
  const { fetchWeatherData, getPolygonAverage, getValueAtTime, clearCache, cacheSize } = useWeatherData();
  const isMobile = useIsMobile();

  // Convert hour index to date string
  const getDateFromHour = (hour: number) => {
    const date = new Date();
    date.setDate(date.getDate() - 15 + Math.floor(hour / 24));
    date.setHours(hour % 24, 0, 0, 0);
    return date.toISOString().split('T')[0];
  };

  const handleTimeRangeChange = useCallback((startHour: number, endHour: number) => {
    setTimeRange({ start: startHour, end: endHour });
    setIsSingleTime(false);
    updatePolygonColors(startHour, endHour);
  }, []);

  const handleSingleTimeChange = useCallback((hour: number) => {
    setTimeRange({ start: hour, end: hour });
    setIsSingleTime(true);
    updatePolygonColors(hour, hour);
  }, []);

  const updatePolygonColors = useCallback((startHour: number, endHour: number) => {
    setPolygons(prevPolygons => 
      prevPolygons.map(polygon => {
        let avgValue: number;
        
        if (isSingleTime) {
          // For single time point, get exact value
          avgValue = getValueAtTime(polygon.coordinates, 'temperature_2m', startHour);
        } else {
          // For time range, get average
          avgValue = getPolygonAverage(polygon.coordinates, 'temperature_2m', startHour, endHour);
        }
        
        // Apply color rules based on thresholds
        let color = '#8b5cf6'; // Default purple
        if (avgValue < 10) color = '#22c55e'; // Green for cold
        else if (avgValue < 25) color = '#f59e0b'; // Orange for moderate  
        else color = '#ef4444'; // Red for hot

        return {
          ...polygon,
          value: Math.round(avgValue * 10) / 10,
          color
        };
      })
    );
  }, [getPolygonAverage, getValueAtTime, isSingleTime]);

  const handlePolygonUpdate = useCallback((updatedPolygon: Polygon) => {
    setPolygons(prev => 
      prev.map(polygon => 
        polygon.id === updatedPolygon.id ? updatedPolygon : polygon
      )
    );
  }, []);

  const handlePolygonCreate = useCallback((polygon: Polygon) => {
    setPolygons(prev => [...prev, polygon]);
    setSelectedPolygons(prev => [...prev, polygon.id]);
    
    // Fetch weather data for the polygon's centroid
    const centroid = polygon.coordinates.reduce(
      (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], 
      [0, 0]
    ).map(sum => sum / polygon.coordinates.length);

    fetchWeatherData({
      latitude: centroid[1],
      longitude: centroid[0],
      startDate: getDateFromHour(0),
      endDate: getDateFromHour(720),
    });
  }, [fetchWeatherData]);

  const handlePolygonDelete = useCallback((id: string) => {
    setPolygons(prev => prev.filter(p => p.id !== id));
    setSelectedPolygons(prev => prev.filter(pid => pid !== id));
  }, []);

  const handleDataSourceChange = useCallback((polygonId: string, dataSource: any) => {
    setPolygons(prev => 
      prev.map(polygon => 
        polygon.id === polygonId 
          ? { ...polygon, dataSource: dataSource.field }
          : polygon
      )
    );
  }, []);

  const handleDataExport = useCallback(() => {
    const exportData = {
      polygons,
      selectedPolygons,
      timeRange,
      timestamp: new Date().toISOString()
    };
    console.log('Exporting data:', exportData);
  }, [polygons, selectedPolygons, timeRange]);

  const handleDataImport = useCallback((data: any) => {
    if (data.polygons) setPolygons(data.polygons);
    if (data.selectedPolygons) setSelectedPolygons(data.selectedPolygons);
    if (data.timeRange) setTimeRange(data.timeRange);
    console.log('Imported data:', data);
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-dashboard ${isMobile ? 'mobile-layout' : ''}`}>
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-6 w-6 text-primary" />
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Geospatial Analytics Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Interactive map visualization with temporal weather data
                </p>
              </div>
            </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {isSingleTime ? 'Single Point' : 'Time Range'} • {polygons.length} regions
                  {isMobile && <span className="block">Mobile Mode</span>}
                </div>
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Dashboard Metrics */}
          <DashboardMetrics 
            timeRange={timeRange}
            onPolygonCreate={() => handlePolygonCreate({
              id: `polygon-${Date.now()}`,
              name: `Demo Region ${polygons.length + 1}`,
              coordinates: [[-74.006, 40.7128], [-74.002, 40.7128], [-74.002, 40.7148], [-74.006, 40.7148], [-74.006, 40.7128]],
              dataSource: 'temperature_2m',
              color: '#8b5cf6'
            })}
          />

          {/* Timeline Slider */}
          <TimelineSlider
            onTimeRangeChange={handleTimeRangeChange}
            onSingleTimeChange={handleSingleTimeChange}
          />

          {/* Main Dashboard Grid */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-5'}`}>
            {/* Sidebar - Mobile stacked, Desktop side-by-side */}
            <div className={`space-y-4 ${isMobile ? 'order-2' : 'xl:col-span-1'}`}>
              <DataSourceSidebar
                onDataSourceChange={handleDataSourceChange}
                selectedPolygons={selectedPolygons}
              />
              
              {/* Mobile Controls */}
              <MobileControls
                isMobile={isMobile}
                onExportData={handleDataExport}
                onImportData={handleDataImport}
                onClearCache={clearCache}
                cacheSize={cacheSize}
              />
            </div>

            {/* Map View */}
            <div className={`${isMobile ? 'order-1' : 'xl:col-span-4'}`}>
              <div className="space-y-4">
                {/* Map Status */}
                <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border/50">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-medium">Interactive Map</span>
                    <Badge variant="secondary">{polygons.length} regions</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isSingleTime ? 'Single Point Analysis' : 'Time Range Analysis'}
                  </div>
                </div>
                
                {/* Map Component */}
                <MapView
                  onPolygonCreate={handlePolygonCreate}
                  onPolygonDelete={handlePolygonDelete}
                  onPolygonUpdate={handlePolygonUpdate}
                  polygons={polygons}
                  timeRange={timeRange}
                  className={`${isMobile ? 'h-[400px]' : 'h-[600px]'}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
