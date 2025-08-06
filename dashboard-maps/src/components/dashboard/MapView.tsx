import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Square, Trash2, Edit3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// For now using a demo token - users should provide their own
mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdGluZyIsImEiOiJjazc5MjJnaG4wZXJnM3BxcG1jNXVnNDF5In0.VZyZWNiYdqhRiPgq8lF_cA';

interface Polygon {
  id: string;
  name: string; // Added polygon naming
  coordinates: number[][];
  dataSource: string;
  color: string;
  value?: number;
  isEditing?: boolean; // For polygon editing mode
}

interface MapViewProps {
  onPolygonCreate: (polygon: Polygon) => void;
  onPolygonDelete: (id: string) => void;
  onPolygonUpdate: (polygon: Polygon) => void; // Added for updates
  polygons: Polygon[];
  timeRange: { start: number; end: number };
  className?: string;
}

export function MapView({ onPolygonCreate, onPolygonDelete, onPolygonUpdate, polygons, timeRange, className }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([]);
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [editingPolygonName, setEditingPolygonName] = useState<string | null>(null);
  const [newPolygonName, setNewPolygonName] = useState('');

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-74.006, 40.7128], // NYC
      zoom: 10,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Disable scroll zoom initially for better UX
    map.current.scrollZoom.disable();

    // Add click handler for polygon drawing
    map.current.on('click', handleMapClick);

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update polygons when they change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing polygon layers
    polygons.forEach((_, index) => {
      if (map.current?.getLayer(`polygon-${index}`)) {
        map.current.removeLayer(`polygon-${index}`);
      }
      if (map.current?.getSource(`polygon-${index}`)) {
        map.current.removeSource(`polygon-${index}`);
      }
    });

    // Add updated polygons
    polygons.forEach((polygon, index) => {
      const geojson = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [polygon.coordinates]
        },
        properties: {
          id: polygon.id,
          dataSource: polygon.dataSource,
          value: polygon.value || 0
        }
      };

      if (map.current) {
        map.current.addSource(`polygon-${index}`, {
          type: 'geojson',
          data: geojson
        });

        map.current.addLayer({
          id: `polygon-${index}`,
          type: 'fill',
          source: `polygon-${index}`,
          paint: {
            'fill-color': polygon.color,
            'fill-opacity': selectedPolygon === polygon.id ? 0.8 : 0.6,
            'fill-outline-color': polygon.color
          }
        });

        // Add click handler for polygon selection
        map.current.on('click', `polygon-${index}`, () => {
          setSelectedPolygon(polygon.id);
          toast({
            title: "Polygon Selected",
            description: `${polygon.dataSource}: ${polygon.value || 'No data'}`,
          });
        });
      }
    });
  }, [polygons, selectedPolygon]);

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isDrawing) return;

    const coords = [e.lngLat.lng, e.lngLat.lat];
    const newPolygon = [...currentPolygon, coords];
    
    setCurrentPolygon(newPolygon);

    // Complete polygon on double-click or when we have enough points
    if (newPolygon.length >= 3) {
      // Add visual feedback for drawing
      updateDrawingPolygon(newPolygon);
    }
  };

  const updateDrawingPolygon = (coords: number[][]) => {
    if (!map.current) return;

    // Remove existing drawing layer
    if (map.current.getLayer('drawing-polygon')) {
      map.current.removeLayer('drawing-polygon');
    }
    if (map.current.getSource('drawing-polygon')) {
      map.current.removeSource('drawing-polygon');
    }

    // Add current drawing state
    const geojson = {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords.length > 2 ? [...coords, coords[0]] : coords]
      },
      properties: {}
    };

    map.current.addSource('drawing-polygon', {
      type: 'geojson',
      data: geojson
    });

    map.current.addLayer({
      id: 'drawing-polygon',
      type: 'fill',
      source: 'drawing-polygon',
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.3,
        'fill-outline-color': '#8b5cf6'
      }
    });
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
    if (map.current) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }
    toast({
      title: "Drawing Mode",
      description: "Click on the map to create polygon points. Right-click to finish.",
    });
  };

  const finishDrawing = () => {
    if (currentPolygon.length < 3) {
      toast({
        title: "Invalid Polygon",
        description: "A polygon needs at least 3 points.",
        variant: "destructive"
      });
      return;
    }

    const newPolygon: Polygon = {
      id: `polygon-${Date.now()}`,
      name: newPolygonName || `Region ${polygons.length + 1}`, // Default naming
      coordinates: [...currentPolygon, currentPolygon[0]], // Close the polygon
      dataSource: 'temperature_2m',
      color: '#8b5cf6',
    };

    onPolygonCreate(newPolygon);
    
    setIsDrawing(false);
    setCurrentPolygon([]);
    setNewPolygonName(''); // Reset name input
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    
    // Remove drawing layer
    if (map.current?.getLayer('drawing-polygon')) {
      map.current.removeLayer('drawing-polygon');
      map.current.removeSource('drawing-polygon');
    }

    toast({
      title: "Polygon Created",
      description: "New analysis region added to the map.",
    });
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    
    if (map.current?.getLayer('drawing-polygon')) {
      map.current.removeLayer('drawing-polygon');
      map.current.removeSource('drawing-polygon');
    }
  };

  const deleteSelectedPolygon = () => {
    if (selectedPolygon) {
      onPolygonDelete(selectedPolygon);
      setSelectedPolygon(null);
      toast({
        title: "Polygon Deleted",
        description: "Analysis region removed from the map.",
      });
    }
  };

  const renamePolygon = (id: string, newName: string) => {
    const polygon = polygons.find(p => p.id === id);
    if (polygon) {
      onPolygonUpdate({ ...polygon, name: newName });
    }
    setEditingPolygonName(null);
  };

  return (
    <Card className={`relative overflow-hidden bg-gradient-card border-border/50 shadow-card ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {/* Drawing Controls */}
        <div className="flex space-x-2">
          <Button
            variant={isDrawing ? "default" : "secondary"}
            size="sm"
            onClick={isDrawing ? finishDrawing : startDrawing}
            className="shadow-elevated"
          >
            <Square className="h-4 w-4 mr-2" />
            {isDrawing ? 'Finish' : 'Draw'}
          </Button>
          
          {isDrawing && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={cancelDrawing}
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Polygon Name Input for Drawing */}
        {isDrawing && (
          <div className="bg-card/90 backdrop-blur p-3 rounded-lg border border-border/50">
            <Input
              placeholder="Enter polygon name..."
              value={newPolygonName}
              onChange={(e) => setNewPolygonName(e.target.value)}
              className="w-48"
            />
          </div>
        )}

        {/* Selected Polygon Controls */}
        {selectedPolygon && (
          <div className="bg-card/90 backdrop-blur p-3 rounded-lg border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Selected Region</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedPolygon}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
            
            {editingPolygonName === selectedPolygon ? (
              <div className="flex space-x-2">
                <Input
                  defaultValue={polygons.find(p => p.id === selectedPolygon)?.name || ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renamePolygon(selectedPolygon, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingPolygonName(null);
                    }
                  }}
                  className="text-xs"
                  autoFocus
                />
              </div>
            ) : (
              <div 
                className="text-sm cursor-pointer hover:text-primary p-1 rounded border border-dashed border-border/50"
                onClick={() => setEditingPolygonName(selectedPolygon)}
              >
                {polygons.find(p => p.id === selectedPolygon)?.name || 'Unnamed Region'}
                <Edit3 className="h-3 w-3 ml-1 inline" />
              </div>
            )}
          </div>
        )}

        {/* Drawing Status */}
        {isDrawing && (
          <Badge variant="default" className="animate-pulse">
            <Edit3 className="h-3 w-3 mr-1" />
            Drawing: {currentPolygon.length} points
          </Badge>
        )}
      </div>

      {/* Polygon count indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="shadow-card">
          <MapPin className="h-3 w-3 mr-1" />
          {polygons.length} regions
        </Badge>
      </div>

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full min-h-[500px]" />
    </Card>
  );
}