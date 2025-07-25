import React, { useMemo } from 'react';
import type { GarminDataExport } from '../../types/garmin';
import { 
  calculateCorrelation, 
  alignDataForCorrelation 
} from '../../services/analytics/correlationAnalysis';
import { format, subDays, isAfter } from 'date-fns';
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle,
  Info
} from 'lucide-react';

interface InsightsProps {
  data: GarminDataExport;
}

interface Insight {
  type: 'positive' | 'negative' | 'info' | 'warning';
  title: string;
  description: string;
  recommendation?: string;
}

export const Insights: React.FC<InsightsProps> = ({ data }) => {
  const insights = useMemo(() => {
    const results: Insight[] = [];
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Prepare recent data
    const recentSleep = data.sleepData.filter(sleep =>
      isAfter(new Date(sleep.sleepStartTimestampGMT), thirtyDaysAgo)
    );
    
    const recentWellness = data.wellnessData.filter(wellness =>
      isAfter(new Date(wellness.calendarDate), thirtyDaysAgo)
    );

    // Sleep insights
    const avgSleepHours = recentSleep.reduce((sum, sleep) => {
      const duration = ((sleep.deepSleepSeconds || 0) + 
                       (sleep.lightSleepSeconds || 0) + 
                       (sleep.remSleepSeconds || 0)) / 3600;
      return sum + duration;
    }, 0) / (recentSleep.length || 1);

    if (avgSleepHours < 7) {
      results.push({
        type: 'warning',
        title: 'Below Recommended Sleep Duration',
        description: `You're averaging ${avgSleepHours.toFixed(1)} hours of sleep, below the recommended 7-9 hours.`,
        recommendation: 'Try establishing a consistent bedtime routine and avoiding screens 1 hour before bed.'
      });
    } else if (avgSleepHours >= 7 && avgSleepHours <= 9) {
      results.push({
        type: 'positive',
        title: 'Healthy Sleep Duration',
        description: `Great job! Your average sleep of ${avgSleepHours.toFixed(1)} hours is within the recommended range.`,
        recommendation: 'Keep maintaining this healthy sleep schedule.'
      });
    }

    // REM sleep insights
    const avgRemHours = recentSleep.reduce((sum, sleep) => 
      sum + (sleep.remSleepSeconds || 0) / 3600, 0
    ) / (recentSleep.length || 1);
    
    const remPercentage = (avgRemHours / avgSleepHours) * 100;
    if (remPercentage < 20) {
      results.push({
        type: 'warning',
        title: 'Low REM Sleep',
        description: `Your REM sleep is ${remPercentage.toFixed(0)}% of total sleep, below the ideal 20-25%.`,
        recommendation: 'REM sleep is crucial for memory and mood. Try reducing alcohol and maintaining consistent sleep times.'
      });
    }

    // Stress insights
    const avgStress = recentWellness.reduce((sum, day) => 
      sum + (day.averageStressLevel || 0), 0
    ) / (recentWellness.filter(d => d.averageStressLevel).length || 1);

    if (avgStress > 75) {
      results.push({
        type: 'negative',
        title: 'High Stress Levels',
        description: `Your average stress level is ${Math.round(avgStress)}, which is considered high.`,
        recommendation: 'Consider stress-reduction techniques like meditation, exercise, or deep breathing exercises.'
      });
    } else if (avgStress < 25) {
      results.push({
        type: 'positive',
        title: 'Excellent Stress Management',
        description: `Your average stress level is ${Math.round(avgStress)}, indicating great stress management.`,
        recommendation: 'Continue your current stress management practices.'
      });
    }

    // Activity insights
    const avgSteps = recentWellness.reduce((sum, day) => 
      sum + (day.totalSteps || 0), 0
    ) / (recentWellness.length || 1);

    if (avgSteps < 5000) {
      results.push({
        type: 'warning',
        title: 'Low Daily Steps',
        description: `You're averaging ${Math.round(avgSteps).toLocaleString()} steps per day.`,
        recommendation: 'Try to increase your daily activity. Even a 10-minute walk can make a difference!'
      });
    } else if (avgSteps >= 10000) {
      results.push({
        type: 'positive',
        title: 'Excellent Activity Level',
        description: `Great work! You're averaging ${Math.round(avgSteps).toLocaleString()} steps per day.`,
        recommendation: 'Keep up the active lifestyle!'
      });
    }

    // Correlation-based insights
    const sleepData = recentSleep.map(sleep => ({
      date: format(new Date(sleep.sleepStartTimestampGMT), 'yyyy-MM-dd'),
      totalSleep: ((sleep.deepSleepSeconds || 0) + (sleep.lightSleepSeconds || 0) + (sleep.remSleepSeconds || 0)) / 3600,
      remSleep: (sleep.remSleepSeconds || 0) / 3600,
    }));

    const wellnessData = recentWellness.map(wellness => ({
      date: wellness.calendarDate,
      stress: wellness.averageStressLevel || 0,
      steps: wellness.totalSteps || 0,
    }));

    // Check stress-sleep correlation
    const { x: stressValues, y: sleepValues } = alignDataForCorrelation(
      wellnessData,
      sleepData,
      'stress',
      'totalSleep'
    );

    if (stressValues.length >= 10) {
      const { r } = calculateCorrelation(stressValues, sleepValues);
      if (r < -0.3) {
        results.push({
          type: 'info',
          title: 'Stress Affects Your Sleep',
          description: `There's a negative correlation (r=${r.toFixed(2)}) between your stress levels and sleep duration.`,
          recommendation: 'Focus on stress reduction in the evening to improve sleep quality.'
        });
      }
    }

    // Body battery insights
    const avgBodyBattery = recentWellness
      .map(w => w.bodyBattery?.bodyBatteryStatList?.slice(-1)[0]?.bodyBatteryLevel)
      .filter(b => b !== undefined)
      .reduce((sum, b) => sum + b!, 0) / 
      (recentWellness.filter(w => w.bodyBattery?.bodyBatteryStatList?.length).length || 1);

    if (avgBodyBattery < 50) {
      results.push({
        type: 'warning',
        title: 'Low Body Battery',
        description: `Your average body battery is ${Math.round(avgBodyBattery)}, indicating inadequate recovery.`,
        recommendation: 'Prioritize sleep and recovery. Consider reducing training intensity temporarily.'
      });
    }

    // Resting heart rate insights
    const avgRestingHR = recentWellness.reduce((sum, day) => 
      sum + (day.restingHeartRate || 0), 0
    ) / (recentWellness.filter(d => d.restingHeartRate).length || 1);

    const hrTrend = recentWellness
      .filter(d => d.restingHeartRate)
      .slice(-7)
      .map(d => d.restingHeartRate!);
    
    if (hrTrend.length >= 7) {
      const recentAvg = hrTrend.reduce((a, b) => a + b, 0) / hrTrend.length;
      const previousAvg = avgRestingHR;
      
      if (recentAvg > previousAvg + 5) {
        results.push({
          type: 'warning',
          title: 'Elevated Resting Heart Rate',
          description: `Your resting HR has increased recently (${Math.round(recentAvg)} vs ${Math.round(previousAvg)} bpm).`,
          recommendation: 'This could indicate stress, overtraining, or illness. Monitor closely and consider rest.'
        });
      }
    }

    return results;
  }, [data]);

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return CheckCircle;
      case 'negative':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
    }
  };

  const getColorClasses = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-900 dark:text-green-100',
          text: 'text-green-700 dark:text-green-300'
        };
      case 'negative':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-900 dark:text-red-100',
          text: 'text-red-700 dark:text-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-900 dark:text-yellow-100',
          text: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-900 dark:text-blue-100',
          text: 'text-blue-700 dark:text-blue-300'
        };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Insights & Recommendations
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Personalized insights based on your health data patterns
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Key Findings
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {insights.filter(i => i.type === 'positive').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Positive</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {insights.filter(i => i.type === 'warning').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {insights.filter(i => i.type === 'negative').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Concerns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {insights.filter(i => i.type === 'info').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Info</p>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = getIcon(insight.type);
          const colors = getColorClasses(insight.type);
          
          return (
            <div
              key={index}
              className={`${colors.bg} rounded-lg border ${colors.border} p-6`}
            >
              <div className="flex items-start space-x-3">
                <Icon className={`w-6 h-6 ${colors.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h3 className={`font-semibold ${colors.title} mb-1`}>
                    {insight.title}
                  </h3>
                  <p className={`${colors.text} mb-2`}>
                    {insight.description}
                  </p>
                  {insight.recommendation && (
                    <div className="mt-3 pt-3 border-t border-current opacity-30">
                      <p className={`text-sm ${colors.text} font-medium`}>
                        Recommendation:
                      </p>
                      <p className={`text-sm ${colors.text}`}>
                        {insight.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* General Tips */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          General Health Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
            Consistency is key - try to maintain regular sleep and wake times
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
            Hydration affects all metrics - aim for 8 glasses of water daily
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
            Recovery is as important as training - listen to your body
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
            Small improvements compound - focus on 1% better each day
          </li>
        </ul>
      </div>
    </div>
  );
};