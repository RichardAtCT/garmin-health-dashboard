import React from 'react';
import type { GarminDataExport } from '../../types/garmin';
import { Activity, Heart, Moon, TrendingUp, Battery } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';

interface OverviewProps {
  data: GarminDataExport;
}

export const Overview: React.FC<OverviewProps> = ({ data }) => {
  // Calculate statistics for the last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const recentSleep = data.sleepData.filter(sleep => 
    isAfter(new Date(sleep.sleepStartTimestampGMT), thirtyDaysAgo)
  );
  
  const recentWellness = data.wellnessData.filter(wellness =>
    isAfter(new Date(wellness.calendarDate), thirtyDaysAgo)
  );
  
  const recentActivities = data.activities.filter(activity =>
    isAfter(new Date(activity.startTimeGMT), thirtyDaysAgo)
  );

  // Calculate averages
  const avgSleepHours = recentSleep.reduce((sum, sleep) => {
    const duration = (sleep.deepSleepSeconds || 0) + 
                    (sleep.lightSleepSeconds || 0) + 
                    (sleep.remSleepSeconds || 0);
    return sum + duration / 3600;
  }, 0) / (recentSleep.length || 1);

  const avgRestingHR = recentWellness.reduce((sum, day) => 
    sum + (day.restingHeartRate || 0), 0
  ) / (recentWellness.filter(d => d.restingHeartRate).length || 1);

  const avgStress = recentWellness.reduce((sum, day) => 
    sum + (day.averageStressLevel || 0), 0
  ) / (recentWellness.filter(d => d.averageStressLevel).length || 1);

  const totalActivities = recentActivities.length;
  
  const avgSteps = recentWellness.reduce((sum, day) => 
    sum + (day.totalSteps || 0), 0
  ) / (recentWellness.length || 1);

  const latestBodyBattery = recentWellness
    .filter(d => d.bodyBattery?.bodyBatteryStatList?.length)
    .slice(-1)[0]?.bodyBattery?.bodyBatteryStatList?.slice(-1)[0]?.bodyBatteryLevel || 0;

  const statCards = [
    {
      title: 'Average Sleep',
      value: avgSleepHours.toFixed(1),
      unit: 'hours',
      icon: Moon,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'Resting Heart Rate',
      value: Math.round(avgRestingHR),
      unit: 'bpm',
      icon: Heart,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: 'Average Stress',
      value: Math.round(avgStress),
      unit: '/100',
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    },
    {
      title: 'Activities',
      value: totalActivities,
      unit: 'last 30 days',
      icon: Activity,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'Daily Steps',
      value: Math.round(avgSteps).toLocaleString(),
      unit: 'average',
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Body Battery',
      value: latestBodyBattery,
      unit: 'current',
      icon: Battery,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Health Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Last 30 days summary of your health metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stat.unit}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Data Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sleep Records</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.sleepData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Wellness Days</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.wellnessData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Activities</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.activities.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.wellnessData.length > 0 
                ? `${format(new Date(data.wellnessData[0].calendarDate), 'MMM d')} - ${format(new Date(data.wellnessData[data.wellnessData.length - 1].calendarDate), 'MMM d')}`
                : 'No data'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};