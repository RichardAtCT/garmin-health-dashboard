export interface SleepData {
  sleepStartTimestampGMT: string;
  sleepEndTimestampGMT: string;
  sleepStartTimestampLocal: string;
  sleepEndTimestampLocal: string;
  unmeasurableSleepSeconds?: number;
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  remSleepSeconds?: number;
  awakeSleepSeconds?: number;
  sleepWindowConfirmationType: string;
  sleepWindowConfirmed: boolean;
  autoSleepStartTimestampGMT?: string;
  autoSleepEndTimestampGMT?: string;
  sleepQualityTypePK?: string;
  sleepResultTypePK?: string;
  averageRespiration?: number;
  lowestRespiration?: number;
  highestRespiration?: number;
  avgSleepStress?: number;
  ageGroup?: string;
  sleepScoreFeedback?: string;
  sleepScoreInsight?: string;
  retro?: boolean;
}

export interface StressDetail {
  startGMT: string;
  endGMT: string;
  stressLevel: number;
}

export interface BodyBatteryDetail {
  startGMT: string;
  endGMT: string;
  timeOffsetHeartRateSamples: number;
  bodyBatteryLevel: number;
  bodyBatteryVersion: number;
}

export interface WellnessData {
  userProfilePK: number;
  calendarDate: string;
  totalSteps?: number;
  totalKilocalories?: number;
  bmrKilocalories?: number;
  wellnessKilocalories?: number;
  activeKilocalories?: number;
  floorsAscended?: number;
  floorsDescended?: number;
  floorsAscendedInMeters?: number;
  floorsDescendedInMeters?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  restingHeartRate?: number;
  lastSevenDaysAvgRestingHeartRate?: number;
  source?: string;
  averageStressLevel?: number;
  maxStressLevel?: number;
  stressDuration?: number;
  restStressDuration?: number;
  activityStressDuration?: number;
  uncategorizedStressDuration?: number;
  totalStressDuration?: number;
  lowStressDuration?: number;
  mediumStressDuration?: number;
  highStressDuration?: number;
  stressPercentage?: number;
  restStressPercentage?: number;
  activityStressPercentage?: number;
  uncategorizedStressPercentage?: number;
  lowStressPercentage?: number;
  mediumStressPercentage?: number;
  highStressPercentage?: number;
  stressQualifier?: string;
  measurableAwakeDuration?: number;
  measurableAsleepDuration?: number;
  lastSyncTimestampGMT?: string;
  allDayStress?: {
    aggregatorList: StressDetail[];
  };
  bodyBattery?: {
    bodyBatteryStatList: BodyBatteryDetail[];
  };
}

export interface HydrationData {
  calendarDate: string;
  valueInML: number;
  timestampGMT: string;
}

export interface Activity {
  activityType: string;
  startTimeGMT: string;
  startTimeLocal: string;
  activityName: string;
  distance?: number;
  duration: number;
  elapsedDuration?: number;
  movingDuration?: number;
  elevationGain?: number;
  elevationLoss?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  calories?: number;
  bmrCalories?: number;
  averageHR?: number;
  maxHR?: number;
  averageRunCadence?: number;
  maxRunCadence?: number;
  averageBikeCadence?: number;
  maxBikeCadence?: number;
  strokes?: number;
  avgStrokes?: number;
  poolLength?: number;
  unitOfPoolLength?: string;
  locationName?: string;
  avgPower?: number;
  maxPower?: number;
  minPower?: number;
  normPower?: number;
  trainingStressScore?: number;
  intensityFactor?: number;
  avgVerticalSpeed?: number;
  lapCount?: number;
  endLatitude?: number;
  endLongitude?: number;
  startLatitude?: number;
  startLongitude?: number;
}

export interface MetricsData {
  metricsDate: string;
  calendarDate: string;
  vo2Max?: number;
  fitnessAge?: number;
  bmi?: number;
  weight?: number;
  percentBodyFat?: number;
  muscleMassWeight?: number;
  boneMassWeight?: number;
  bodyWaterPercentage?: number;
  physiqueRating?: number;
  visceralFatRating?: number;
  metabolicAge?: number;
}

export interface GarminDataExport {
  sleepData: SleepData[];
  wellnessData: WellnessData[];
  hydrationData: HydrationData[];
  activities: Activity[];
  metricsData: MetricsData[];
}