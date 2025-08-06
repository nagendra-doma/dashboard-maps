import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Settings, 
  Database, 
  Thermometer, 
  Wind, 
  Droplets, 
  Sun,
  Trash2,
  Plus,
  Circle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  field: string;
  icon: React.ReactNode;
  unit: string;
  description: string;
  thresholds: {
    low: { value: number; color: string; operator: string; label: string };
    medium: { value: number; color: string; operator: string; label: string };
    high: { value: number; color: string; operator: string; label: string };
  };
  isActive: boolean;
}

interface DataSourceSidebarProps {
  onDataSourceChange: (polygonId: string, dataSource: DataSource) => void;
  selectedPolygons: string[];
  className?: string;
}

const availableDataSources: DataSource[] = [
  {
    id: 'temperature_2m',
    name: 'Temperature',
    field: 'temperature_2m',
    icon: <Thermometer className="h-4 w-4" />,
    unit: '°C',
    description: 'Air temperature at 2 meters above ground',
    thresholds: {
      low: { value: 10, color: '#22c55e', operator: '<', label: 'Cold' },
      medium: { value: 25, color: '#f59e0b', operator: '<', label: 'Moderate' },
      high: { value: 25, color: '#ef4444', operator: '>=', label: 'Hot' }
    },
    isActive: true
  },
  {
    id: 'relative_humidity_2m',
    name: 'Humidity',
    field: 'relative_humidity_2m',
    icon: <Droplets className="h-4 w-4" />,
    unit: '%',
    description: 'Relative humidity at 2 meters above ground',
    thresholds: {
      low: { value: 30, color: '#22c55e', operator: '<', label: 'Dry' },
      medium: { value: 70, color: '#f59e0b', operator: '<', label: 'Comfortable' },
      high: { value: 70, color: '#ef4444', operator: '>=', label: 'Humid' }
    },
    isActive: false
  },
  {
    id: 'wind_speed_10m',
    name: 'Wind Speed',
    field: 'wind_speed_10m',
    icon: <Wind className="h-4 w-4" />,
    unit: 'km/h',
    description: 'Wind speed at 10 meters above ground',
    thresholds: {
      low: { value: 10, color: '#22c55e', operator: '<', label: 'Calm' },
      medium: { value: 30, color: '#f59e0b', operator: '<', label: 'Breezy' },
      high: { value: 30, color: '#ef4444', operator: '>=', label: 'Windy' }
    },
    isActive: false
  }
];

export function DataSourceSidebar({ onDataSourceChange, selectedPolygons, className }: DataSourceSidebarProps) {
  const [activeDataSources, setActiveDataSources] = useState<DataSource[]>([availableDataSources[0]]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  const addDataSource = () => {
    if (activeDataSources.length < 3) {
      const nextInactive = availableDataSources.find(ds => 
        !activeDataSources.some(active => active.id === ds.id)
      );
      if (nextInactive) {
        setActiveDataSources([...activeDataSources, { ...nextInactive, isActive: true }]);
      }
    }
  };

  const removeDataSource = (index: number) => {
    const newSources = activeDataSources.filter((_, i) => i !== index);
    setActiveDataSources(newSources);
    setEditingIndex(null);
  };

  const updateDataSource = (index: number, updatedSource: DataSource) => {
    const newSources = [...activeDataSources];
    newSources[index] = updatedSource;
    setActiveDataSources(newSources);
    
    // Notify parent of changes for all selected polygons
    selectedPolygons.forEach(polygonId => {
      onDataSourceChange(polygonId, updatedSource);
    });
  };

  const updateThreshold = (index: number, level: 'low' | 'medium' | 'high', field: 'value' | 'operator' | 'label', value: string | number) => {
    const newSources = [...activeDataSources];
    if (field === 'value') {
      newSources[index].thresholds[level].value = value as number;
    } else if (field === 'operator') {
      newSources[index].thresholds[level].operator = value as string;
    } else {
      newSources[index].thresholds[level].label = value as string;
    }
    setActiveDataSources(newSources);
  };

  const toggleDataSourceVisibility = (index: number) => {
    const newSources = [...activeDataSources];
    newSources[index].isActive = !newSources[index].isActive;
    setActiveDataSources(newSources);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Data Sources Card */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Data Sources</h3>
            </div>
            <Badge variant="secondary">{selectedPolygons.length} selected</Badge>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-6">
              {activeDataSources.map((dataSource, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleDataSourceVisibility(index)}
                      >
                        {dataSource.isActive ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Circle 
                        className="h-3 w-3" 
                        style={{ 
                          color: dataSource.isActive ? dataSource.thresholds.medium.color : '#6b7280',
                          fill: dataSource.isActive ? dataSource.thresholds.medium.color : 'transparent'
                        }} 
                      />
                      <div className="flex items-center space-x-2">
                        {dataSource.icon}
                        <span className="font-medium">{dataSource.name}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-48">{dataSource.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      {activeDataSources.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeDataSource(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingIndex === index && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      {/* Data Source Selection */}
                      <div>
                        <Label>Data Field</Label>
                        <Select 
                          value={dataSource.field}
                          onValueChange={(value) => {
                            const source = availableDataSources.find(s => s.field === value);
                            if (source) updateDataSource(index, { ...source, isActive: dataSource.isActive });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDataSources.map(source => (
                              <SelectItem key={source.id} value={source.field}>
                                <div className="flex items-center space-x-2">
                                  {source.icon}
                                  <span>{source.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Threshold Configuration */}
                      <div className="space-y-3">
                        <Label>Color Rules & Thresholds</Label>
                        
                        {(['low', 'medium', 'high'] as const).map((level) => (
                          <div key={level} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: dataSource.thresholds[level].color }}
                              />
                              <Select
                                value={dataSource.thresholds[level].operator}
                                onValueChange={(value) => updateThreshold(index, level, 'operator', value)}
                              >
                                <SelectTrigger className="w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<">&lt;</SelectItem>
                                  <SelectItem value="<=">&le;</SelectItem>
                                  <SelectItem value=">">&gt;</SelectItem>
                                  <SelectItem value=">=">&ge;</SelectItem>
                                  <SelectItem value="=">=</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={dataSource.thresholds[level].value}
                                onChange={(e) => updateThreshold(index, level, 'value', parseFloat(e.target.value))}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground w-8">{dataSource.unit}</span>
                              <Input
                                value={dataSource.thresholds[level].label}
                                onChange={(e) => updateThreshold(index, level, 'label', e.target.value)}
                                className="flex-1"
                                placeholder="Label"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {index < activeDataSources.length - 1 && <Separator />}
                </div>
              ))}

              {/* Add Data Source Button */}
              {activeDataSources.length < 3 && (
                <Button 
                  variant="outline" 
                  className="w-full border-dashed"
                  onClick={addDataSource}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Data Source
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>
      </Card>

      {/* Legend Card */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Color Legend</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowLegend(!showLegend)}
            >
              {showLegend ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          
          {showLegend && (
            <div className="space-y-3">
              {activeDataSources.filter(ds => ds.isActive).map((dataSource, dsIndex) => (
                <div key={dsIndex} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {dataSource.icon}
                    <span className="text-sm font-medium">{dataSource.name}</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {Object.entries(dataSource.thresholds).map(([level, threshold]) => (
                      <div key={level} className="flex items-center space-x-2 text-xs">
                        <Circle 
                          className="h-2 w-2" 
                          style={{ color: threshold.color, fill: threshold.color }} 
                        />
                        <span>
                          {threshold.label}: {threshold.operator} {threshold.value} {dataSource.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <div className="p-4">
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-center space-x-2">
              <Sun className="h-3 w-3" />
              <span>Data from Open-Meteo API</span>
            </div>
            <div>Select polygons on the map to apply these data sources and color rules.</div>
            <div>Use the timeline slider to see how data changes over time.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}