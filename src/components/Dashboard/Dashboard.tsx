import React, { useState } from 'react';
import type { GarminDataExport } from '../../types/garmin';
import { FileUpload } from '../FileUpload/FileUpload';
import { DashboardLayout } from '../Layout/DashboardLayout';
import { Overview } from '../Analysis/Overview';
import { SleepAnalysis } from '../Analysis/SleepAnalysis';
import { CorrelationAnalysis } from '../Analysis/CorrelationAnalysis';
import { WeeklyPatterns } from '../Analysis/WeeklyPatterns';
import { Insights } from '../Analysis/Insights';

export const Dashboard: React.FC = () => {
  const [garminData, setGarminData] = useState<GarminDataExport | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDataLoaded = (data: GarminDataExport) => {
    setGarminData(data);
    setActiveTab('overview');
  };

  if (!garminData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Garmin Health Dashboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Analyze your health data with advanced correlations and insights
            </p>
          </div>
          <FileUpload onDataLoaded={handleDataLoaded} />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <Overview data={garminData} />}
      {activeTab === 'sleep' && <SleepAnalysis data={garminData} />}
      {activeTab === 'correlations' && <CorrelationAnalysis data={garminData} />}
      {activeTab === 'patterns' && <WeeklyPatterns data={garminData} />}
      {activeTab === 'insights' && <Insights data={garminData} />}
    </DashboardLayout>
  );
};