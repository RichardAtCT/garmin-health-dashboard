import React, { useCallback, useState } from 'react';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import type { GarminDataExport } from '../../types/garmin';
import { parseGarminData } from '../../services/dataParser/garminParser';

interface FileUploadProps {
  onDataLoaded: (data: GarminDataExport) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const processZipFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      setUploadProgress(20);
      
      const garminData = await parseGarminData(content, (progress) => {
        setUploadProgress(20 + progress * 0.8);
      });
      
      // Check if we parsed any data
      const totalRecords = 
        garminData.sleepData.length + 
        garminData.wellnessData.length + 
        garminData.activities.length +
        garminData.hydrationData.length +
        garminData.metricsData.length;
      
      if (totalRecords === 0) {
        throw new Error('No data found in the ZIP file. Please ensure you uploaded the correct Garmin export file. Check the browser console for details.');
      }
      
      console.log('Successfully parsed Garmin data:', {
        sleep: garminData.sleepData.length,
        wellness: garminData.wellnessData.length,
        activities: garminData.activities.length,
        hydration: garminData.hydrationData.length,
        metrics: garminData.metricsData.length
      });
      
      onDataLoaded(garminData);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('Error processing file:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.toLowerCase().endsWith('.zip'));

    if (zipFile) {
      processZipFile(zipFile);
    } else {
      setError('Please upload a ZIP file');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const zipFile = files[0];
      if (zipFile.name.toLowerCase().endsWith('.zip')) {
        processZipFile(zipFile);
      } else {
        setError('Please upload a ZIP file');
      }
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200 cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400 dark:hover:border-gray-500'}
        `}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="space-y-4">
          {isProcessing ? (
            <>
              <FileCheck className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">Processing Garmin data...</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{Math.round(uploadProgress)}%</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Drop your Garmin export ZIP file here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  or click to browse
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        <p>Your data is processed entirely in your browser.</p>
        <p>No information is sent to any server.</p>
      </div>
    </div>
  );
};