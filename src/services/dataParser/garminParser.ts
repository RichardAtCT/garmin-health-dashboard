import JSZip from 'jszip';
import type { GarminDataExport, SleepData, WellnessData, HydrationData, Activity, MetricsData } from '../../types/garmin';

export async function parseGarminData(
  zip: JSZip, 
  onProgress?: (progress: number) => void
): Promise<GarminDataExport> {
  const result: GarminDataExport = {
    sleepData: [],
    wellnessData: [],
    hydrationData: [],
    activities: [],
    metricsData: []
  };

  const files = Object.keys(zip.files);
  let processedFiles = 0;

  for (const filename of files) {
    const file = zip.files[filename];
    
    if (file.dir) continue;
    
    try {
      const content = await file.async('string');
      const data = JSON.parse(content);
      
      // Parse sleep data
      if (filename.includes('sleepData.json')) {
        result.sleepData = parseSleepData(data);
      }
      
      // Parse wellness data (UDS files)
      else if (filename.includes('UDSFile_')) {
        const wellnessData = parseWellnessData(data);
        if (wellnessData) {
          result.wellnessData.push(wellnessData);
        }
      }
      
      // Parse hydration data
      else if (filename.includes('HydrationLogFile_')) {
        const hydrationData = parseHydrationData(data);
        result.hydrationData.push(...hydrationData);
      }
      
      // Parse activities
      else if (filename.includes('summarizedActivities.json')) {
        result.activities = parseActivities(data);
      }
      
      // Parse metrics data
      else if (filename.includes('MetricsMaxMetData_')) {
        const metricsData = parseMetricsData(data);
        if (metricsData) {
          result.metricsData.push(metricsData);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse file ${filename}:`, error);
    }
    
    processedFiles++;
    if (onProgress) {
      onProgress(processedFiles / files.length);
    }
  }
  
  // Sort data by date
  result.sleepData.sort((a, b) => 
    new Date(a.sleepStartTimestampGMT).getTime() - new Date(b.sleepStartTimestampGMT).getTime()
  );
  result.wellnessData.sort((a, b) => 
    new Date(a.calendarDate).getTime() - new Date(b.calendarDate).getTime()
  );
  result.hydrationData.sort((a, b) => 
    new Date(a.calendarDate).getTime() - new Date(b.calendarDate).getTime()
  );
  result.activities.sort((a, b) => 
    new Date(a.startTimeGMT).getTime() - new Date(b.startTimeGMT).getTime()
  );
  result.metricsData.sort((a, b) => 
    new Date(a.calendarDate).getTime() - new Date(b.calendarDate).getTime()
  );
  
  return result;
}

function parseSleepData(data: any): SleepData[] {
  if (Array.isArray(data)) {
    return data.filter(item => item && typeof item === 'object');
  }
  return [];
}

function parseWellnessData(data: any): WellnessData | null {
  if (data && typeof data === 'object' && data.calendarDate) {
    return data;
  }
  return null;
}

function parseHydrationData(data: any): HydrationData[] {
  if (Array.isArray(data)) {
    return data.filter(item => 
      item && typeof item === 'object' && item.valueInML !== undefined
    );
  }
  return [];
}

function parseActivities(data: any): Activity[] {
  if (Array.isArray(data)) {
    return data.filter(item => 
      item && typeof item === 'object' && item.activityType && item.startTimeGMT
    );
  }
  return [];
}

function parseMetricsData(data: any): MetricsData | null {
  if (data && typeof data === 'object' && data.calendarDate) {
    return data;
  }
  return null;
}