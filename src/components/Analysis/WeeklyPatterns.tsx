import React, { useMemo } from 'react';
import type { GarminDataExport } from '../../types/garmin';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import { getDay, subDays, isAfter } from 'date-fns';
import { Calendar, TrendingUp, Moon, Activity } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface WeeklyPatternsProps {
  data: GarminDataExport;
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WeeklyPatterns: React.FC<WeeklyPatternsProps> = ({ data }) => {
  const patterns = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    // Initialize weekly accumulator
    const weeklyData = daysOfWeek.reduce((acc, day) => {
      acc[day] = {
        sleep: { total: 0, count: 0 },
        steps: { total: 0, count: 0 },
        stress: { total: 0, count: 0 },
        activities: { total: 0, count: 0 },
        restingHR: { total: 0, count: 0 },
        bodyBattery: { total: 0, count: 0 },
      };
      return acc;
    }, {} as Record<string, any>);

    // Process sleep data
    data.sleepData
      .filter(sleep => isAfter(new Date(sleep.sleepStartTimestampGMT), thirtyDaysAgo))
      .forEach(sleep => {
        const dayIndex = getDay(new Date(sleep.sleepStartTimestampGMT));
        const dayName = daysOfWeek[dayIndex];
        const duration = ((sleep.deepSleepSeconds || 0) + 
                         (sleep.lightSleepSeconds || 0) + 
                         (sleep.remSleepSeconds || 0)) / 3600;
        
        weeklyData[dayName].sleep.total += duration;
        weeklyData[dayName].sleep.count += 1;
      });

    // Process wellness data
    data.wellnessData
      .filter(wellness => isAfter(new Date(wellness.calendarDate), thirtyDaysAgo))
      .forEach(wellness => {
        const dayIndex = getDay(new Date(wellness.calendarDate));
        const dayName = daysOfWeek[dayIndex];
        
        if (wellness.totalSteps) {
          weeklyData[dayName].steps.total += wellness.totalSteps;
          weeklyData[dayName].steps.count += 1;
        }
        
        if (wellness.averageStressLevel) {
          weeklyData[dayName].stress.total += wellness.averageStressLevel;
          weeklyData[dayName].stress.count += 1;
        }
        
        if (wellness.restingHeartRate) {
          weeklyData[dayName].restingHR.total += wellness.restingHeartRate;
          weeklyData[dayName].restingHR.count += 1;
        }
        
        const bodyBattery = wellness.bodyBattery?.bodyBatteryStatList?.slice(-1)[0]?.bodyBatteryLevel;
        if (bodyBattery) {
          weeklyData[dayName].bodyBattery.total += bodyBattery;
          weeklyData[dayName].bodyBattery.count += 1;
        }
      });

    // Process activities
    data.activities
      .filter(activity => isAfter(new Date(activity.startTimeGMT), thirtyDaysAgo))
      .forEach(activity => {
        const dayIndex = getDay(new Date(activity.startTimeGMT));
        const dayName = daysOfWeek[dayIndex];
        
        weeklyData[dayName].activities.total += activity.duration / 60; // Convert to minutes
        weeklyData[dayName].activities.count += 1;
      });

    // Calculate averages
    const weeklyAverages = daysOfWeek.map(day => ({
      day,
      sleep: weeklyData[day].sleep.count > 0 
        ? weeklyData[day].sleep.total / weeklyData[day].sleep.count : 0,
      steps: weeklyData[day].steps.count > 0 
        ? weeklyData[day].steps.total / weeklyData[day].steps.count : 0,
      stress: weeklyData[day].stress.count > 0 
        ? weeklyData[day].stress.total / weeklyData[day].stress.count : 0,
      activities: weeklyData[day].activities.count > 0 
        ? weeklyData[day].activities.total / weeklyData[day].activities.count : 0,
      restingHR: weeklyData[day].restingHR.count > 0 
        ? weeklyData[day].restingHR.total / weeklyData[day].restingHR.count : 0,
      bodyBattery: weeklyData[day].bodyBattery.count > 0 
        ? weeklyData[day].bodyBattery.total / weeklyData[day].bodyBattery.count : 0,
    }));

    // Find best/worst days
    const sortedBySleep = [...weeklyAverages].sort((a, b) => b.sleep - a.sleep);
    const sortedByStress = [...weeklyAverages].sort((a, b) => a.stress - b.stress);
    const sortedByActivity = [...weeklyAverages].sort((a, b) => b.activities - a.activities);

    return {
      weeklyAverages,
      bestSleepDay: sortedBySleep[0],
      worstSleepDay: sortedBySleep[sortedBySleep.length - 1],
      leastStressDay: sortedByStress[0],
      mostActiveDay: sortedByActivity[0],
    };
  }, [data]);

  // Radar chart data
  const radarData = {
    labels: daysOfWeek,
    datasets: [
      {
        label: 'Sleep Hours',
        data: patterns.weeklyAverages.map(d => d.sleep),
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        borderColor: 'rgb(147, 51, 234)',
        pointBackgroundColor: 'rgb(147, 51, 234)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(147, 51, 234)',
      },
    ],
  };

  // Bar chart data for multiple metrics
  const multiMetricData = {
    labels: daysOfWeek,
    datasets: [
      {
        label: 'Steps (thousands)',
        data: patterns.weeklyAverages.map(d => d.steps / 1000),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Stress Level',
        data: patterns.weeklyAverages.map(d => d.stress),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
      {
        label: 'Activity (hours)',
        data: patterns.weeklyAverages.map(d => d.activities / 60),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Weekly Patterns
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Discover your weekly health and activity patterns
        </p>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <Moon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Best Sleep</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {patterns.bestSleepDay.day}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {patterns.bestSleepDay.sleep.toFixed(1)} hours avg
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Most Active</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {patterns.mostActiveDay.day}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {patterns.mostActiveDay.activities.toFixed(0)} min avg
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Least Stress</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {patterns.leastStressDay.day}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {patterns.leastStressDay.stress.toFixed(0)} avg level
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Weekend vs Weekday</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {patterns.weeklyAverages
              .filter((_d, i) => i === 0 || i === 6)
              .reduce((sum, d) => sum + d.sleep, 0) / 2 >
            patterns.weeklyAverages
              .filter((_d, i) => i > 0 && i < 6)
              .reduce((sum, d) => sum + d.sleep, 0) / 5
              ? 'Weekend'
              : 'Weekday'} Sleep
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Better recovery
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Sleep Pattern
          </h3>
          <div className="max-w-md mx-auto">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Multi-Metric Comparison
          </h3>
          <Bar data={multiMetricData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Weekly Averages
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Day</th>
                <th className="text-right py-2 px-3 font-medium text-gray-900 dark:text-white">Sleep (h)</th>
                <th className="text-right py-2 px-3 font-medium text-gray-900 dark:text-white">Steps</th>
                <th className="text-right py-2 px-3 font-medium text-gray-900 dark:text-white">Stress</th>
                <th className="text-right py-2 px-3 font-medium text-gray-900 dark:text-white">Activity (min)</th>
                <th className="text-right py-2 px-3 font-medium text-gray-900 dark:text-white">Resting HR</th>
              </tr>
            </thead>
            <tbody>
              {patterns.weeklyAverages.map((day, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{day.day}</td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                    {day.sleep.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                    {Math.round(day.steps).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                    {Math.round(day.stress)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                    {Math.round(day.activities)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                    {Math.round(day.restingHR)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};