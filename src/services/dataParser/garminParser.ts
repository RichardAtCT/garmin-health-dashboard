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
      
      // Parse wellness data (UDS files) - these contain daily wellness data
      else if (filename.includes('UDSFile_')) {
        console.log('Found wellness/UDS file');
        // UDS files contain an array of daily wellness records
        if (Array.isArray(data)) {
          data.forEach(record => {
            const wellnessData = parseWellnessData(record);
            if (wellnessData) {
              result.wellnessData.push(wellnessData);
            }
          });
          console.log(`Added ${data.length} wellness records from UDS file`);
        }
      }
      
      // Parse hydration data
      else if (filename.toLowerCase().includes('hydration')) {
        console.log('Found hydration file');
        const hydrationData = parseHydrationData(data);
        result.hydrationData.push(...hydrationData);
        console.log(`Added ${hydrationData.length} hydration records`);
      }
      
      // Parse activities - check for summarized activities
      else if (filename.toLowerCase().includes('summarizedactivities') || filename.includes('_summarizedActivities')) {
        console.log('Found activities file');
        const activities = parseActivities(data);
        result.activities.push(...activities);
        console.log(`Added ${activities.length} activities`);
      }
      
      // Parse metrics data
      else if (filename.includes('MetricsMaxMetData_')) {
        console.log('Found metrics file');
        // These files might have a nested structure
        if (data && typeof data === 'object') {
          const metricsData = parseMetricsData(data);
          if (metricsData) {
            result.metricsData.push(metricsData);
            console.log('Added metrics data');
          }
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
    new Date(a.startTimeGmt).getTime() - new Date(b.startTimeGmt).getTime()
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
    // Map the UDS file structure to our WellnessData type
    return {
      userProfilePK: data.userProfilePK,
      calendarDate: data.calendarDate,
      totalSteps: data.totalSteps,
      totalKilocalories: data.totalKilocalories,
      bmrKilocalories: data.bmrKilocalories,
      wellnessKilocalories: data.wellnessKilocalories,
      activeKilocalories: data.activeKilocalories,
      floorsAscended: data.floorsAscended,
      floorsDescended: data.floorsDescended,
      floorsAscendedInMeters: data.floorsAscendedInMeters,
      floorsDescendedInMeters: data.floorsDescendedInMeters,
      minHeartRate: data.minHeartRate,
      maxHeartRate: data.maxHeartRate,
      restingHeartRate: data.restingHeartRate,
      lastSevenDaysAvgRestingHeartRate: data.lastSevenDaysAvgRestingHeartRate,
      source: data.source,
      averageStressLevel: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.averageStressLevel,
      maxStressLevel: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.maxStressLevel,
      stressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.stressDuration,
      restStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.restDuration,
      activityStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.activityDuration,
      uncategorizedStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.uncategorizedDuration,
      totalStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.totalDuration,
      lowStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.lowDuration,
      mediumStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.mediumDuration,
      highStressDuration: data.allDayStress?.aggregatorList?.find((agg: any) => agg.type === 'TOTAL')?.highDuration,
      stressPercentage: data.stressPercentage,
      restStressPercentage: data.restStressPercentage,
      activityStressPercentage: data.activityStressPercentage,
      uncategorizedStressPercentage: data.uncategorizedStressPercentage,
      lowStressPercentage: data.lowStressPercentage,
      mediumStressPercentage: data.mediumStressPercentage,
      highStressPercentage: data.highStressPercentage,
      stressQualifier: data.stressQualifier,
      measurableAwakeDuration: data.measurableAwakeDuration,
      measurableAsleepDuration: data.measurableAsleepDuration,
      lastSyncTimestampGMT: data.lastSyncTimestampGMT,
      allDayStress: data.allDayStress,
      bodyBattery: data.bodyBattery,
    };
  }
  return null;
}

function parseHydrationData(data: any): HydrationData[] {
  if (Array.isArray(data)) {
    return data.filter(item => 
      item && typeof item === 'object' && item.valueInML !== undefined
    ).map(item => ({
      calendarDate: item.calendarDate,
      valueInML: item.valueInML,
      timestampGMT: item.timestampGMT || new Date(item.calendarDate).toISOString(),
    }));
  }
  return [];
}

function parseActivities(data: any): Activity[] {
  // Handle the summarizedActivitiesExport structure
  if (Array.isArray(data) && data.length > 0 && data[0].summarizedActivitiesExport) {
    // Extract activities from the nested structure
    const activities: Activity[] = [];
    data.forEach(item => {
      if (item.summarizedActivitiesExport && Array.isArray(item.summarizedActivitiesExport)) {
        item.summarizedActivitiesExport.forEach((activity: any) => {
          activities.push({
            activityType: activity.activityType || activity.sportType,
            startTimeGMT: new Date(activity.startTimeGmt || activity.beginTimestamp).toISOString(),
            startTimeLocal: new Date(activity.startTimeLocal || activity.beginTimestamp).toISOString(),
            activityName: activity.name || activity.activityType,
            distance: activity.distance,
            duration: activity.duration,
            elapsedDuration: activity.elapsedDuration,
            movingDuration: activity.movingDuration,
            elevationGain: activity.elevationGain,
            elevationLoss: activity.elevationLoss,
            averageSpeed: activity.avgSpeed,
            maxSpeed: activity.maxSpeed,
            calories: activity.calories,
            bmrCalories: activity.bmrCalories,
            averageHR: activity.avgHr,
            maxHR: activity.maxHr,
            averageRunCadence: activity.avgRunCadence,
            maxRunCadence: activity.maxRunCadence,
            averageBikeCadence: activity.avgBikeCadence,
            maxBikeCadence: activity.maxBikeCadence,
            strokes: activity.strokes,
            avgStrokes: activity.avgStrokes,
            poolLength: activity.poolLength,
            unitOfPoolLength: activity.unitOfPoolLength,
            locationName: activity.locationName,
            avgPower: activity.avgPower,
            maxPower: activity.maxPower,
            minPower: activity.minPower,
            normPower: activity.normPower,
            trainingStressScore: activity.trainingStressScore,
            intensityFactor: activity.intensityFactor,
            avgVerticalSpeed: activity.avgVerticalSpeed,
            lapCount: activity.lapCount,
            endLatitude: activity.endLatitude,
            endLongitude: activity.endLongitude,
            startLatitude: activity.startLatitude,
            startLongitude: activity.startLongitude,
          });
        });
      }
    });
    return activities;
  }
  
  // Handle direct array of activities
  if (Array.isArray(data)) {
    return data.filter(item => 
      item && typeof item === 'object' && item.activityType && item.startTimeGMT
    );
  }
  
  // Handle other wrapper structures
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
  // MetricsMaxMetData files might have a different structure
  if (data && typeof data === 'object') {
    // Check if data has the expected fields
    if (data.calendarDate || data.metricsDate) {
      return {
        ...data,
        calendarDate: data.calendarDate || data.metricsDate
      };
    }
    // Check if it's an array with a single metrics object
    if (Array.isArray(data) && data.length > 0 && data[0].calendarDate) {
      return data[0];
    }
  }
  return null;
}