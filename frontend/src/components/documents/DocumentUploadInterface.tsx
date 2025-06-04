'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { AITransparencyWrapper } from '../ai/AITransparencyWrapper';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  uploadProgress?: number;
  error?: string;
  analysis?: DocumentAnalysisResult;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress?: number;
}

interface DocumentAnalysisResult {
  summary: string;
  keyInsights: string[];
  requirements: Array<{
    requirementType: string;
    requirementText: string;
    confidenceScore: number;
    importanceLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  complianceGaps: Array<{
    gapType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestedAction: string;
  }>;
}

export const DocumentUploadInterface: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  }, []);

  const handleFileSelection = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading',
      progress: 0,
      uploadProgress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadFile of newFiles) {
      await uploadDocument(uploadFile);
    }
  };

  const uploadDocument = async (uploadFile: UploadedFile) => {
    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('description', '');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploaded', progress: 0, id: result.document.id }
          : f
      ));

      // Start monitoring processing
      monitorProcessing(result.document.id, uploadFile.id);

    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
    }
  };

  const monitorProcessing = async (documentId: string, fileId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) return;

        const status = await response.json();
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: status.document.uploadStatus,
                progress: status.overallProgress
              }
            : f
        ));

        if (status.document.uploadStatus === 'completed') {
          // Fetch analysis results
          const analysisResponse = await fetch(`/api/documents/${documentId}/analysis`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            setUploadedFiles(prev => prev.map(f => 
              f.id === fileId 
                ? { ...f, analysis: analysisData.results }
                : f
            ));
          }
          return;
        }

        if (status.document.uploadStatus === 'failed') {
          return;
        }

        // Continue monitoring
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkStatus, 2000);
  };

  const getProcessingSteps = (file: UploadedFile): ProcessingStep[] => {
    const steps: ProcessingStep[] = [
      { name: 'Document Upload', status: 'completed' },
      { name: 'Text Extraction', status: 'pending' },
      { name: 'AI Analysis', status: 'pending' },
      { name: 'Compliance Check', status: 'pending' },
      { name: 'Report Generation', status: 'pending' }
    ];

    if (file.status === 'processing') {
      const progress = file.progress || 0;
      if (progress >= 20) steps[1].status = 'completed';
      if (progress >= 40) steps[2].status = 'completed';
      if (progress >= 60) steps[3].status = 'completed';
      if (progress >= 80) steps[4].status = 'completed';
      
      // Set current step as in-progress
      const currentStepIndex = steps.findIndex(step => step.status === 'pending');
      if (currentStepIndex >= 0) {
        steps[currentStepIndex].status = 'in-progress';
      }
    } else if (file.status === 'completed') {
      steps.forEach(step => step.status = 'completed');
    }

    return steps;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'uploading': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStepStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✓';
      case 'in-progress': return '⟳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Document Upload & Analysis</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <p className="text-lg text-gray-600 mb-2">
            Drag and drop files here, or click to select
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports PDF, DOC, DOCX, XLS, XLSX, TXT (max 10MB)
          </p>
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Choose Files
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          {uploadedFiles.map((file) => (
            <Card key={file.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{file.file.name}</h4>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.file.size)} • {file.file.type}
                  </p>
                </div>
                <div className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                  {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                </div>
              </div>

              {/* Progress Bar */}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Processing Progress</span>
                    <span>{file.progress}%</span>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                </div>
              )}

              {/* Error Message */}
              {file.status === 'failed' && file.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{file.error}</p>
                </div>
              )}

              {/* Processing Steps */}
              {(file.status === 'processing' || file.status === 'completed') && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Processing Steps</h5>
                  <div className="space-y-2">
                    {getProcessingSteps(file).map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className={`text-sm ${
                          step.status === 'completed' ? 'text-green-600' :
                          step.status === 'in-progress' ? 'text-blue-600' :
                          step.status === 'failed' ? 'text-red-600' :
                          'text-gray-400'
                        }`}>
                          {getStepStatusIcon(step.status)}
                        </span>
                        <span className="text-sm text-gray-700">{step.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {file.status === 'completed' && file.analysis && (
                <AITransparencyWrapper
                  confidence={0.85}
                  model="gpt-4o-mini"
                  reasoning="Document analyzed using AI to extract requirements and identify compliance gaps"
                >
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Analysis Results</h5>
                    
                    {/* Summary */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700 mb-1">Summary</h6>
                      <p className="text-sm text-gray-600">{file.analysis.summary}</p>
                    </div>

                    {/* Key Insights */}
                    {file.analysis.keyInsights.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-sm font-medium text-gray-700 mb-1">Key Insights</h6>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {file.analysis.keyInsights.map((insight, index) => (
                            <li key={index}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Requirements */}
                    {file.analysis.requirements.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-sm font-medium text-gray-700 mb-1">
                          Requirements Found ({file.analysis.requirements.length})
                        </h6>
                        <div className="space-y-2">
                          {file.analysis.requirements.slice(0, 3).map((req, index) => (
                            <div key={index} className="p-2 bg-white rounded border">
                              <div className="flex justify-between items-start">
                                <span className="text-sm text-gray-800">{req.requirementText}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  req.importanceLevel === 'critical' ? 'bg-red-100 text-red-700' :
                                  req.importanceLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                  req.importanceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {req.importanceLevel}
                                </span>
                              </div>
                            </div>
                          ))}
                          {file.analysis.requirements.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{file.analysis.requirements.length - 3} more requirements
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compliance Gaps */}
                    {file.analysis.complianceGaps.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-1">
                          Compliance Gaps ({file.analysis.complianceGaps.length})
                        </h6>
                        <div className="space-y-2">
                          {file.analysis.complianceGaps.slice(0, 2).map((gap, index) => (
                            <div key={index} className="p-2 bg-white rounded border border-red-200">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm text-gray-800">{gap.description}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                  gap.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                  gap.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {gap.severity}
                                </span>
                              </div>
                              {gap.suggestedAction && (
                                <p className="text-xs text-blue-600 mt-1">
                                  💡 {gap.suggestedAction}
                                </p>
                              )}
                            </div>
                          ))}
                          {file.analysis.complianceGaps.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{file.analysis.complianceGaps.length - 2} more gaps identified
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AITransparencyWrapper>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};