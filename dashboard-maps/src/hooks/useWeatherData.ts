import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface WeatherDataPoint {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
}

interface WeatherParams {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  hourly?: string[];
}

interface CacheEntry {
  data: WeatherDataPoint[];
  timestamp: number;
  params: string;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = 'weather_data_cache';

export function useWeatherData() {
  const [data, setData] = useState<WeatherDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(CACHE_KEY);
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        const cacheMap = new Map();
        
        // Filter out expired entries
        const now = Date.now();
        Object.entries(parsedCache).forEach(([key, entry]: [string, any]) => {
          if (now - entry.timestamp < CACHE_DURATION) {
            cacheMap.set(key, entry);
          }
        });
        
        setCache(cacheMap);
      }
    } catch (err) {
      console.warn('Failed to load weather data cache:', err);
    }
  }, []);

  // Save cache to localStorage when it changes
  useEffect(() => {
    try {
      const cacheObject = Object.fromEntries(cache);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (err) {
      console.warn('Failed to save weather data cache:', err);
    }
  }, [cache]);

  const generateCacheKey = (params: WeatherParams): string => {
    return `${params.latitude}_${params.longitude}_${params.startDate}_${params.endDate}_${params.hourly?.join(',') || 'default'}`;
  };

  const fetchWeatherData = useCallback(async (params: WeatherParams) => {
    const cacheKey = generateCacheKey(params);
    
    // Check cache first
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
      setData(cachedEntry.data);
      setLoading(false);
      setError(null);
      
      toast({
        title: "Data Loaded from Cache",
        description: `Using cached weather data for the selected region.`,
      });
      
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hourlyParams = params.hourly || [
        'temperature_2m',
        'relative_humidity_2m', 
        'wind_speed_10m'
      ];

      const url = new URL('https://archive-api.open-meteo.com/v1/archive');
      url.searchParams.append('latitude', params.latitude.toString());
      url.searchParams.append('longitude', params.longitude.toString());
      url.searchParams.append('start_date', params.startDate);
      url.searchParams.append('end_date', params.endDate);
      url.searchParams.append('hourly', hourlyParams.join(','));
      url.searchParams.append('timezone', 'auto');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.hourly) {
        throw new Error('No hourly data received from API');
      }

      // Transform the data into a more usable format
      const transformedData: WeatherDataPoint[] = result.hourly.time.map((time: string, index: number) => ({
        time,
        temperature_2m: result.hourly.temperature_2m?.[index] || 0,
        relative_humidity_2m: result.hourly.relative_humidity_2m?.[index] || 0,
        wind_speed_10m: result.hourly.wind_speed_10m?.[index] || 0,
      }));

      setData(transformedData);
      
      // Cache the result
      const newCache = new Map(cache);
      newCache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now(),
        params: JSON.stringify(params)
      });
      setCache(newCache);
      
      toast({
        title: "Weather Data Loaded",
        description: `Fetched ${transformedData.length} data points from Open-Meteo API.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      
      toast({
        title: "Error Loading Weather Data",
        description: errorMessage,
        variant: "destructive"
      });

      // Fallback to mock data for demonstration
      const mockData = generateMockData(params);
      setData(mockData);
      
      toast({
        title: "Using Mock Data",
        description: "Switched to simulated weather data for demonstration.",
        variant: "default"
      });

    } finally {
      setLoading(false);
    }
  }, [cache]);

  const generateMockData = (params: WeatherParams): WeatherDataPoint[] => {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    return Array.from({ length: hours }, (_, i) => {
      const time = new Date(start.getTime() + i * 60 * 60 * 1000);
      const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      
      // Realistic seasonal temperature variation
      const seasonalTemp = 15 + 10 * Math.sin((dayOfYear / 365) * 2 * Math.PI - Math.PI / 2);
      const dailyVariation = 5 * Math.sin((i % 24 / 24) * 2 * Math.PI - Math.PI / 2);
      const randomVariation = (Math.random() - 0.5) * 3;
      
      return {
        time: time.toISOString(),
        temperature_2m: seasonalTemp + dailyVariation + randomVariation,
        relative_humidity_2m: 40 + Math.random() * 40, // 40-80% humidity
        wind_speed_10m: 5 + Math.random() * 25, // 5-30 km/h wind
      };
    });
  };

  const getPolygonAverage = useCallback((coordinates: number[][], field: keyof WeatherDataPoint, timeStart: number, timeEnd: number) => {
    if (data.length === 0) return 0;

    // For simplicity, use the centroid of the polygon
    const centroid = coordinates.reduce(
      (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], 
      [0, 0]
    ).map(sum => sum / coordinates.length);

    // Filter data by time range
    const startIndex = Math.max(0, timeStart);
    const endIndex = Math.min(data.length - 1, timeEnd);
    const relevantData = data.slice(startIndex, endIndex + 1);
    
    if (relevantData.length === 0) return 0;

    // Calculate average for the field
    const sum = relevantData.reduce((acc, point) => {
      const value = point[field];
      return acc + (typeof value === 'number' ? value : 0);
    }, 0);

    return sum / relevantData.length;
  }, [data]);

  const getValueAtTime = useCallback((coordinates: number[][], field: keyof WeatherDataPoint, timeIndex: number) => {
    if (data.length === 0 || timeIndex < 0 || timeIndex >= data.length) return 0;
    
    const dataPoint = data[timeIndex];
    const value = dataPoint[field];
    return typeof value === 'number' ? value : 0;
  }, [data]);

  const clearCache = useCallback(() => {
    setCache(new Map());
    localStorage.removeItem(CACHE_KEY);
    
    toast({
      title: "Cache Cleared",
      description: "Weather data cache has been cleared.",
    });
  }, []);

  const getCacheInfo = useCallback(() => {
    return {
      size: cache.size,
      entries: Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        age: Date.now() - entry.timestamp,
        dataPoints: entry.data.length
      }))
    };
  }, [cache]);

  return {
    data,
    loading,
    error,
    fetchWeatherData,
    getPolygonAverage,
    getValueAtTime,
    clearCache,
    getCacheInfo,
    cacheSize: cache.size
  };
}