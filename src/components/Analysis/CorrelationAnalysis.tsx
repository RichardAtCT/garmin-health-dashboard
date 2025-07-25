import React, { useMemo, useState } from 'react';
import type { GarminDataExport } from '../../types/garmin';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { 
  calculateCorrelation, 
  alignDataForCorrelation,
  calculateLaggedCorrelation
} from '../../services/analytics/correlationAnalysis';
import type { CorrelationResult } from '../../services/analytics/correlationAnalysis';
import { format } from 'date-fns';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface CorrelationAnalysisProps {
  data: GarminDataExport;
}

export const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ data }) => {
  const [, setSelectedCorrelation] = useState<CorrelationResult | null>(null);

  const correlations = useMemo(() => {
    const results: CorrelationResult[] = [];

    // Prepare data for analysis
    const sleepData = data.sleepData.map(sleep => ({
      date: format(new Date(sleep.sleepStartTimestampGMT), 'yyyy-MM-dd'),
      totalSleep: ((sleep.deepSleepSeconds || 0) + (sleep.lightSleepSeconds || 0) + (sleep.remSleepSeconds || 0)) / 3600,
      remSleep: (sleep.remSleepSeconds || 0) / 3600,
      deepSleep: (sleep.deepSleepSeconds || 0) / 3600,
      sleepEfficiency: sleep.awakeSleepSeconds ? 
        (1 - (sleep.awakeSleepSeconds / ((sleep.deepSleepSeconds || 0) + (sleep.lightSleepSeconds || 0) + (sleep.remSleepSeconds || 0) + sleep.awakeSleepSeconds))) * 100 : 100,
    }));

    const wellnessData = data.wellnessData.map(wellness => ({
      date: wellness.calendarDate,
      steps: wellness.totalSteps || 0,
      restingHR: wellness.restingHeartRate || 0,
      stress: wellness.averageStressLevel || 0,
      bodyBattery: wellness.bodyBattery?.bodyBatteryStatList?.slice(-1)[0]?.bodyBatteryLevel || 0,
      activeCalories: wellness.activeKilocalories || 0,
    }));

    const activityData = data.activities.map(activity => ({
      date: format(new Date(activity.startTimeGMT), 'yyyy-MM-dd'),
      duration: activity.duration / 60, // Convert to minutes
      calories: activity.calories || 0,
      avgHR: activity.averageHR || 0,
    }));

    // Aggregate activity data by day
    const dailyActivity = activityData.reduce((acc, activity) => {
      if (!acc[activity.date]) {
        acc[activity.date] = { date: activity.date, totalDuration: 0, totalCalories: 0, avgHR: [] };
      }
      acc[activity.date].totalDuration += activity.duration;
      acc[activity.date].totalCalories += activity.calories;
      if (activity.avgHR > 0) acc[activity.date].avgHR.push(activity.avgHR);
      return acc;
    }, {} as Record<string, any>);

    const dailyActivityArray = Object.values(dailyActivity).map((day: any) => ({
      ...day,
      avgHR: day.avgHR.length > 0 ? day.avgHR.reduce((a: number, b: number) => a + b, 0) / day.avgHR.length : 0,
    }));

    // Calculate correlations
    const correlationPairs = [
      // REM Sleep correlations
      { data1: sleepData, metric1: 'remSleep', label1: 'REM Sleep', data2: wellnessData, metric2: 'stress', label2: 'Stress Level' },
      { data1: sleepData, metric1: 'remSleep', label1: 'REM Sleep', data2: wellnessData, metric2: 'bodyBattery', label2: 'Body Battery' },
      { data1: sleepData, metric1: 'remSleep', label1: 'REM Sleep', data2: wellnessData, metric2: 'restingHR', label2: 'Resting HR' },
      { data1: sleepData, metric1: 'remSleep', label1: 'REM Sleep', data2: dailyActivityArray, metric2: 'totalDuration', label2: 'Exercise Duration' },
      
      // Sleep quality correlations
      { data1: sleepData, metric1: 'totalSleep', label1: 'Total Sleep', data2: wellnessData, metric2: 'stress', label2: 'Stress Level' },
      { data1: sleepData, metric1: 'totalSleep', label1: 'Total Sleep', data2: wellnessData, metric2: 'bodyBattery', label2: 'Body Battery' },
      { data1: sleepData, metric1: 'deepSleep', label1: 'Deep Sleep', data2: wellnessData, metric2: 'stress', label2: 'Stress Level' },
      { data1: sleepData, metric1: 'sleepEfficiency', label1: 'Sleep Efficiency', data2: wellnessData, metric2: 'stress', label2: 'Stress Level' },
      
      // General health correlations
      { data1: wellnessData, metric1: 'stress', label1: 'Stress Level', data2: wellnessData, metric2: 'bodyBattery', label2: 'Body Battery' },
      { data1: wellnessData, metric1: 'steps', label1: 'Daily Steps', data2: sleepData, metric2: 'totalSleep', label2: 'Total Sleep' },
      { data1: wellnessData, metric1: 'restingHR', label1: 'Resting HR', data2: wellnessData, metric2: 'stress', label2: 'Stress Level' },
      { data1: dailyActivityArray, metric1: 'totalDuration', label1: 'Exercise Duration', data2: sleepData, metric2: 'totalSleep', label2: 'Total Sleep' },
    ];

    correlationPairs.forEach(pair => {
      const { x, y, dates } = alignDataForCorrelation(
        pair.data1,
        pair.data2,
        pair.metric1,
        pair.metric2
      );

      if (x.length >= 10) {
        // Same-day correlation
        const { r, pValue } = calculateCorrelation(x, y);
        results.push({
          metric1: pair.label1,
          metric2: pair.label2,
          correlation: r,
          pValue,
          sampleSize: x.length,
        });

        // Time-lagged correlation (previous day's metric1 → today's metric2)
        if (dates.length > 10) {
          const laggedResult = calculateLaggedCorrelation(x, y, dates, 1);
          results.push({
            metric1: `${pair.label1} (prev day)`,
            metric2: `${pair.label2} (today)`,
            correlation: laggedResult.r,
            pValue: laggedResult.pValue,
            sampleSize: x.length - 1,
          });
        }
      }
    });

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [data]);

  const significantCorrelations = correlations.filter(c => c.pValue < 0.05);
  const strongCorrelations = significantCorrelations.filter(c => Math.abs(c.correlation) > 0.3);
  const moderateCorrelations = significantCorrelations.filter(c => Math.abs(c.correlation) > 0.2);
  
  // Log correlations for debugging
  if (correlations.length > 0) {
    console.log('All correlations:', correlations);
    console.log('Significant correlations:', significantCorrelations);
    console.log('Moderate correlations:', moderateCorrelations);
  }

  const getCorrelationColor = (r: number) => {
    if (r > 0.5) return 'text-green-600 dark:text-green-400';
    if (r > 0.3) return 'text-green-500 dark:text-green-500';
    if (r > 0.2) return 'text-green-400 dark:text-green-600';
    if (r < -0.5) return 'text-red-600 dark:text-red-400';
    if (r < -0.3) return 'text-red-500 dark:text-red-500';
    if (r < -0.2) return 'text-red-400 dark:text-red-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getCorrelationIcon = (r: number) => {
    if (r > 0.2) return TrendingUp;
    if (r < -0.2) return TrendingDown;
    return Minus;
  };

  const getCorrelationStrength = (r: number) => {
    const absR = Math.abs(r);
    if (absR > 0.7) return 'Very Strong';
    if (absR > 0.5) return 'Strong';
    if (absR > 0.3) return 'Moderate';
    if (absR > 0.1) return 'Weak';
    return 'Negligible';
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Health Correlations
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Discover relationships between your health metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Correlations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {correlations.length}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Significant</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {significantCorrelations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">p &lt; 0.05</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Moderate+</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {moderateCorrelations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">|r| &gt; 0.2</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Correlations List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {moderateCorrelations.length > 0 ? 'Significant Correlations' : 'All Significant Correlations (No Strong Correlations Found)'}
        </h3>
        {moderateCorrelations.length === 0 && significantCorrelations.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            No significant correlations found in your data. This might be due to insufficient data or high variability in your metrics.
          </p>
        ) : (
        <div className="space-y-3">
          {(moderateCorrelations.length > 0 ? moderateCorrelations : significantCorrelations).slice(0, 10).map((corr, index) => {
            const Icon = getCorrelationIcon(corr.correlation);
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedCorrelation(corr)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${getCorrelationColor(corr.correlation)}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {corr.metric1} ↔ {corr.metric2}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getCorrelationStrength(corr.correlation)} ({corr.sampleSize} samples)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${getCorrelationColor(corr.correlation)}`}>
                    {corr.correlation.toFixed(3)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    p = {corr.pValue.toFixed(4)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        )}
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Positive Correlations
          </h3>
          <ul className="space-y-2">
            {(moderateCorrelations.length > 0 ? moderateCorrelations : significantCorrelations)
              .filter(c => c.correlation > 0)
              .slice(0, 5)
              .map((corr, index) => (
                <li key={index} className="text-blue-700 dark:text-blue-300 text-sm">
                  ↑ {corr.metric1} relates to ↑ {corr.metric2} (r={corr.correlation.toFixed(2)})
                </li>
              ))}
          </ul>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-3">
            Negative Correlations
          </h3>
          <ul className="space-y-2">
            {(moderateCorrelations.length > 0 ? moderateCorrelations : significantCorrelations)
              .filter(c => c.correlation < 0)
              .slice(0, 5)
              .map((corr, index) => (
                <li key={index} className="text-red-700 dark:text-red-300 text-sm">
                  ↑ {corr.metric1} relates to ↓ {corr.metric2} (r={corr.correlation.toFixed(2)})
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};