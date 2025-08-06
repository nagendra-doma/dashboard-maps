import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  Smartphone, 
  Monitor, 
  Palette,
  Database,
  Trash2,
  Download,
  Upload
} from 'lucide-react';

interface MobileControlsProps {
  isMobile: boolean;
  onExportData: () => void;
  onImportData: (data: any) => void;
  onClearCache: () => void;
  cacheSize: number;
  className?: string;
}

export function MobileControls({ 
  isMobile, 
  onExportData, 
  onImportData, 
  onClearCache, 
  cacheSize,
  className 
}: MobileControlsProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [compressionLevel, setCompressionLevel] = useState(75);

  useEffect(() => {
    // Apply mobile-specific optimizations
    if (isMobile) {
      document.body.classList.add('mobile-optimized');
    } else {
      document.body.classList.remove('mobile-optimized');
    }
  }, [isMobile]);

  const handleDataExport = () => {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        settings: {
          darkMode: isDarkMode,
          autoRefresh,
          notifications,
          compressionLevel
        },
        cache: cacheSize
      };
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `geospatial-dashboard-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      onExportData();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDataImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          onImportData(data);
          
          // Apply imported settings
          if (data.settings) {
            setIsDarkMode(data.settings.darkMode);
            setAutoRefresh(data.settings.autoRefresh);
            setNotifications(data.settings.notifications);
            setCompressionLevel(data.settings.compressionLevel || 75);
          }
        } catch (error) {
          console.error('Import failed:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className={`bg-gradient-card border-border/50 shadow-card ${className}`}>
      <div className="p-4 space-y-4">
        {/* Device Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isMobile ? (
              <Smartphone className="h-4 w-4 text-primary" />
            ) : (
              <Monitor className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-medium">
              {isMobile ? 'Mobile' : 'Desktop'} Mode
            </span>
          </div>
          <Badge variant={isMobile ? "default" : "secondary"}>
            {isMobile ? 'Touch' : 'Mouse'}
          </Badge>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Dark Mode</span>
            <Switch 
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Refresh</span>
            <Switch 
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Notifications</span>
            <Switch 
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
        </div>

        {/* Performance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Performance</span>
            <span className="text-xs text-muted-foreground">{compressionLevel}%</span>
          </div>
          <Progress value={compressionLevel} className="h-2" />
        </div>

        {/* Cache Management */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-3 w-3" />
              <span className="text-sm">Cache</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {cacheSize} entries
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearCache}
            className="w-full"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Clear Cache
          </Button>
        </div>

        {/* Data Management */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDataExport}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <label className="cursor-pointer">
              <Button 
                variant="outline" 
                size="sm"
                asChild
              >
                <span>
                  <Upload className="h-3 w-3 mr-1" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleDataImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Mobile-specific Features */}
        {isMobile && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Tap and hold to draw polygons</div>
              <div>• Pinch to zoom map</div>
              <div>• Swipe timeline to scrub</div>
              <div>• Double-tap to select regions</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}