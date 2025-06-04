'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import ComplianceChecker from '../../../components/compliance/ComplianceChecker';

interface ComplianceStats {
  totalChecks: number;
  averageScore: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
}

interface Application {
  id: string;
  title: string;
  grantSchemeId: string;
  complianceScore: number;
  complianceStatus: string;
  lastComplianceCheck: string;
}

export default function CompliancePage() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch compliance statistics
      const statsResponse = await fetch('/compliance/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch applications with compliance data
      const appsResponse = await fetch('/applications?include_compliance=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData.data || []);
      }

    } catch (error) {
      setError('Failed to load compliance data');
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage compliance across all your grant applications
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Checks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalChecks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalIssues}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Issues</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.majorIssues + stats.minorIssues}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Applications List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Applications</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {applications.map((app) => (
              <div 
                key={app.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedApplication === app.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedApplication(app.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{app.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(app.complianceStatus)}`}>
                    {app.complianceStatus || 'pending'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Score: {app.complianceScore || 0}%</span>
                  {app.lastComplianceCheck && (
                    <span>
                      Checked: {new Date(app.lastComplianceCheck).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {applications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No applications found</p>
                <p className="text-sm">Create an application to start compliance checking</p>
              </div>
            )}
          </div>
        </Card>

        {/* Compliance Checker */}
        <div>
          {selectedApplication ? (
            <ComplianceChecker
              applicationId={selectedApplication}
              grantSchemeId={applications.find(a => a.id === selectedApplication)?.grantSchemeId || ''}
              onComplianceUpdate={(report) => {
                // Update the application in the list
                setApplications(prev => 
                  prev.map(app => 
                    app.id === selectedApplication 
                      ? {
                          ...app,
                          complianceScore: report.overallScore,
                          complianceStatus: report.criticalIssuesCount > 0 ? 'failed' : 
                                           report.majorIssuesCount > 0 ? 'warning' : 'passed',
                          lastComplianceCheck: report.checkedAt
                        }
                      : app
                  )
                );
                // Refresh stats
                fetchData();
              }}
            />
          ) : (
            <Card className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an Application
              </h3>
              <p className="text-gray-500">
                Choose an application from the list to run compliance checks.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => window.location.href = '/dashboard/applications/create'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create New Application
          </Button>
          
          <Button 
            variant="outline" 
            onClick={fetchData}
          >
            Refresh Data
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {
              // Run compliance checks for all applications
              applications.forEach(app => {
                if (app.complianceScore === 0 || !app.lastComplianceCheck) {
                  // This would be implemented to batch check applications
                  console.log('Would check compliance for:', app.id);
                }
              });
            }}
          >
            Check All Applications
          </Button>
        </div>
      </Card>
    </div>
  );
}