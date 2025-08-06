import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TimelineSliderProps {
  onTimeRangeChange: (startHour: number, endHour: number) => void;
  onSingleTimeChange: (hour: number) => void;
  className?: string;
}

export function TimelineSlider({ onTimeRangeChange, onSingleTimeChange, className }: TimelineSliderProps) {
  const [isRangeMode, setIsRangeMode] = useState(true); // Default to range mode as per spec
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState([360]); // 15 days * 24 hours = 360 (middle of 30-day window)
  const [rangeValue, setRangeValue] = useState([336, 384]); // Default 24-hour range centered
  const [playSpeed, setPlaySpeed] = useState(1000); // Animation speed in ms
  
  // 30 days * 24 hours = 720 total hours
  const maxHours = 720;
  const currentTime = new Date();
  
  // Convert hour index to actual date
  const getDateFromHour = (hour: number) => {
    const date = new Date(currentTime);
    date.setDate(date.getDate() - 15 + Math.floor(hour / 24));
    date.setHours(hour % 24, 0, 0, 0);
    return date;
  };

  const formatDate = (hour: number) => {
    const date = getDateFromHour(hour);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: hour % 24 === 0 ? undefined : 'numeric'
    });
  };

  useEffect(() => {
    if (isRangeMode) {
      onTimeRangeChange(rangeValue[0], rangeValue[1]);
    } else {
      onSingleTimeChange(currentValue[0]);
    }
  }, [isRangeMode, currentValue, rangeValue, onTimeRangeChange, onSingleTimeChange]);

  // Auto-play functionality with animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (isRangeMode) {
        setRangeValue(prev => {
          const rangeSize = prev[1] - prev[0];
          const newStart = Math.min(prev[0] + 1, maxHours - rangeSize);
          const newEnd = Math.min(prev[1] + 1, maxHours);
          if (newEnd >= maxHours) {
            setIsPlaying(false);
            return prev;
          }
          return [newStart, newEnd];
        });
      } else {
        setCurrentValue(prev => {
          const newValue = Math.min(prev[0] + 1, maxHours);
          if (newValue >= maxHours) {
            setIsPlaying(false);
            return prev;
          }
          return [newValue];
        });
      }
    }, playSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, isRangeMode, maxHours, playSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (isRangeMode) {
      setRangeValue(prev => [
        Math.max(prev[0] - 24, 0),
        Math.max(prev[1] - 24, 24)
      ]);
    } else {
      setCurrentValue(prev => [Math.max(prev[0] - 24, 0)]);
    }
  };

  const handleSkipForward = () => {
    if (isRangeMode) {
      setRangeValue(prev => [
        Math.min(prev[0] + 24, maxHours - 24),
        Math.min(prev[1] + 24, maxHours)
      ]);
    } else {
      setCurrentValue(prev => [Math.min(prev[0] + 24, maxHours)]);
    }
  };

  const activeValue = isRangeMode ? rangeValue : currentValue;

  return (
    <Card className={`p-6 bg-gradient-card border-border/50 shadow-card ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Time Period</h3>
            <Badge variant="secondary" className="ml-2">
              {isRangeMode 
                ? `${formatDate(rangeValue[0])} - ${formatDate(rangeValue[1])}`
                : formatDate(currentValue[0])
              }
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={isRangeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsRangeMode(!isRangeMode)}
              className="text-xs"
            >
              {isRangeMode ? "Range" : "Single Point"}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3">
          <Button variant="ghost" size="icon" onClick={handleSkipBack}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button 
            variant={isPlaying ? "default" : "outline"} 
            size="icon" 
            onClick={handlePlayPause}
            className="h-10 w-10"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSkipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>
          {isPlaying && <Badge variant="default" className="animate-pulse">Playing</Badge>}
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <div className="px-2">
            <Slider
              value={activeValue}
              onValueChange={isRangeMode ? setRangeValue : setCurrentValue}
              min={0}
              max={maxHours}
              step={1}
              className="w-full"
              disabled={isPlaying}
            />
          </div>
          
          {/* Time labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>{formatDate(0)}</span>
            <span className="text-primary font-medium">
              {isRangeMode 
                ? `${Math.floor((rangeValue[1] - rangeValue[0]) / 24)} days`
                : 'Current'
              }
            </span>
            <span>{formatDate(maxHours)}</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsRangeMode(true);
              setRangeValue([336, 384]); // Last 2 days
            }}
          >
            Last 2 Days
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsRangeMode(true);
              setRangeValue([264, 384]); // Last 5 days
            }}
          >
            Last 5 Days
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsRangeMode(true);
              setRangeValue([216, 384]); // Last week
            }}
          >
            Last Week
          </Button>
        </div>
      </div>
    </Card>
  );
}