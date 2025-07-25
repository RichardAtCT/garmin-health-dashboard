import React, { useMemo } from 'react';
import type { GarminDataExport } from '../../types/garmin';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { format, subDays, isAfter } from 'date-fns';
import { Moon, TrendingUp, Clock, Zap } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SleepAnalysisProps {
  data: GarminDataExport;
}

export const SleepAnalysis: React.FC<SleepAnalysisProps> = ({ data }) => {
  const analysis = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentSleep = data.sleepData.filter(sleep =>
      isAfter(new Date(sleep.sleepStartTimestampGMT), ninetyDaysAgo)
    );

    // Calculate sleep stages
    const sleepStages = recentSleep.map(sleep => {
      const deep = (sleep.deepSleepSeconds || 0) / 3600;
      const light = (sleep.lightSleepSeconds || 0) / 3600;
      const rem = (sleep.remSleepSeconds || 0) / 3600;
      const awake = (sleep.awakeSleepSeconds || 0) / 3600;
      const total = deep + light + rem;

      return {
        date: format(new Date(sleep.sleepStartTimestampGMT), 'MMM d'),
        deep,
        light,
        rem,
        awake,
        total,
        efficiency: total > 0 ? ((total - awake) / total) * 100 : 0,
      };
    });

    // Calculate averages
    const totals = sleepStages.reduce(
      (acc, night) => ({
        deep: acc.deep + night.deep,
        light: acc.light + night.light,
        rem: acc.rem + night.rem,
        total: acc.total + night.total,
        efficiency: acc.efficiency + night.efficiency,
      }),
      { deep: 0, light: 0, rem: 0, total: 0, efficiency: 0 }
    );

    const count = sleepStages.length || 1;
    const averages = {
      deep: totals.deep / count,
      light: totals.light / count,
      rem: totals.rem / count,
      total: totals.total / count,
      efficiency: totals.efficiency / count,
    };

    // Find best and worst nights
    const sortedByTotal = [...sleepStages].sort((a, b) => b.total - a.total);
    const bestNight = sortedByTotal[0];
    const worstNight = sortedByTotal[sortedByTotal.length - 1];

    // Weekly patterns
    const weeklyPattern = recentSleep.reduce((acc, sleep) => {
      const dayOfWeek = format(new Date(sleep.sleepStartTimestampGMT), 'EEEE');
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = { total: 0, count: 0 };
      }
      const duration = ((sleep.deepSleepSeconds || 0) +
        (sleep.lightSleepSeconds || 0) +
        (sleep.remSleepSeconds || 0)) / 3600;
      acc[dayOfWeek].total += duration;
      acc[dayOfWeek].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      sleepStages,
      averages,
      bestNight,
      worstNight,
      weeklyPattern,
      recentSleep,
    };
  }, [data.sleepData]);

  // Chart configurations
  const sleepTrendData = {
    labels: analysis.sleepStages.slice(-30).map(s => s.date),
    datasets: [
      {
        label: 'Total Sleep',
        data: analysis.sleepStages.slice(-30).map(s => s.total),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const sleepStagesData = {
    labels: ['Deep Sleep', 'Light Sleep', 'REM Sleep'],
    datasets: [
      {
        data: [
          analysis.averages.deep,
          analysis.averages.light,
          analysis.averages.rem,
        ],
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)',
          'rgba(147, 197, 253, 0.8)',
          'rgba(167, 139, 250, 0.8)',
        ],
        borderColor: [
          'rgb(79, 70, 229)',
          'rgb(147, 197, 253)',
          'rgb(167, 139, 250)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const weeklyData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Average Sleep Hours',
        data: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
          day => {
            const pattern = analysis.weeklyPattern[day];
            return pattern ? pattern.total / pattern.count : 0;
          }
        ),
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 12,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sleep Analysis
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Detailed analysis of your sleep patterns over the last 90 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Sleep</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.averages.total.toFixed(1)}h
              </p>
            </div>
            <Moon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sleep Efficiency</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.averages.efficiency.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">REM Sleep</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.averages.rem.toFixed(1)}h
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Deep Sleep</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.averages.deep.toFixed(1)}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sleep Trend (Last 30 Days)
          </h3>
          <Line data={sleepTrendData} options={chartOptions} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sleep Stage Distribution
          </h3>
          <div className="max-w-xs mx-auto">
            <Pie data={sleepStagesData} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Weekly Sleep Pattern
        </h3>
        <Bar data={weeklyData} options={chartOptions as any} />
      </div>

      {/* Best and Worst Nights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
            Best Night
          </h3>
          {analysis.bestNight && (
            <div className="space-y-2">
              <p className="text-green-700 dark:text-green-300">
                {analysis.bestNight.date}: {analysis.bestNight.total.toFixed(1)} hours
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Efficiency: {analysis.bestNight.efficiency.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Worst Night
          </h3>
          {analysis.worstNight && (
            <div className="space-y-2">
              <p className="text-red-700 dark:text-red-300">
                {analysis.worstNight.date}: {analysis.worstNight.total.toFixed(1)} hours
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Efficiency: {analysis.worstNight.efficiency.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};