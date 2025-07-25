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

  console.log('Starting to parse Garmin data...');
  console.log('Total files in ZIP:', files.length);
  console.log('File list:', files.filter(f => !zip.files[f].dir));

  for (const filename of files) {
    const file = zip.files[filename];
    
    if (file.dir) continue;
    
    try {
      const content = await file.async('string');
      let data;
      
      try {
        data = JSON.parse(content);
      } catch (e) {
        console.log(`File ${filename} is not JSON, skipping...`);
        continue;
      }
      
      console.log(`Processing file: ${filename}`);
      
      // Parse sleep data - check for various naming patterns
      if (filename.toLowerCase().includes('sleep') && filename.endsWith('.json')) {
        console.log('Found sleep data file');
        const sleepData = parseSleepData(data);
        console.log(`Parsed ${sleepData.length} sleep records`);
        result.sleepData.push(...sleepData);
      }
      
      // Parse wellness data (UDS files)
      else if (filename.includes('UDSFile_') || filename.toLowerCase().includes('uds')) {
        console.log('Found wellness/UDS file');
        const wellnessData = parseWellnessData(data);
        if (wellnessData) {
          result.wellnessData.push(wellnessData);
          console.log('Added wellness data for date:', wellnessData.calendarDate);
        }
      }
      
      // Parse hydration data
      else if (filename.toLowerCase().includes('hydration')) {
        console.log('Found hydration file');
        const hydrationData = parseHydrationData(data);
        result.hydrationData.push(...hydrationData);
        console.log(`Added ${hydrationData.length} hydration records`);
      }
      
      // Parse activities
      else if (filename.toLowerCase().includes('activities') || filename.toLowerCase().includes('summarized')) {
        console.log('Found activities file');
        const activities = parseActivities(data);
        result.activities.push(...activities);
        console.log(`Added ${activities.length} activities`);
      }
      
      // Parse metrics data
      else if (filename.includes('MetricsMaxMetData_') || filename.toLowerCase().includes('metrics')) {
        console.log('Found metrics file');
        const metricsData = parseMetricsData(data);
        if (metricsData) {
          result.metricsData.push(metricsData);
          console.log('Added metrics data for date:', metricsData.calendarDate);
        }
      }
      
      // Log unknown JSON files
      else if (filename.endsWith('.json')) {
        console.log(`Unknown JSON file: ${filename}`);
        console.log('Sample data:', JSON.stringify(data).slice(0, 200));
      }
    } catch (error) {
      console.warn(`Failed to parse file ${filename}:`, error);
    }
    
    processedFiles++;
    if (onProgress) {
      onProgress(processedFiles / files.length);
    }
  }
  
  // Log final counts
  console.log('Parsing complete:');
  console.log(`- Sleep records: ${result.sleepData.length}`);
  console.log(`- Wellness records: ${result.wellnessData.length}`);
  console.log(`- Hydration records: ${result.hydrationData.length}`);
  console.log(`- Activities: ${result.activities.length}`);
  console.log(`- Metrics records: ${result.metricsData.length}`);
  
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
  // Handle case where data might be wrapped in an object
  if (data && typeof data === 'object') {
    // Check for common wrapper properties
    const possibleArrays = ['sleepData', 'data', 'records', 'items'];
    for (const prop of possibleArrays) {
      if (Array.isArray(data[prop])) {
        return data[prop].filter((item: any) => item && typeof item === 'object');
      }
    }
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
  // Handle case where data might be wrapped in an object
  if (data && typeof data === 'object') {
    const possibleArrays = ['summarizedActivities', 'activities', 'data', 'records'];
    for (const prop of possibleArrays) {
      if (Array.isArray(data[prop])) {
        return data[prop].filter((item: any) => 
          item && typeof item === 'object' && item.activityType && item.startTimeGMT
        );
      }
    }
  }
  return [];
}

function parseMetricsData(data: any): MetricsData | null {
  if (data && typeof data === 'object' && data.calendarDate) {
    return data;
  }
  return null;
}