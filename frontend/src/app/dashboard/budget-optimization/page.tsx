'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import BudgetOptimizer from '../../../components/budget/BudgetOptimizer';

interface OptimizationHistory {
  id: string;
  projectScope: any;
  fundingRules: any;
  optimizedBudget: any;
  analysisResults: any;
  createdAt: string;
}

interface BudgetStats {
  totalOptimizations: number;
  averageConfidence: number;
  optimizationsWithSavings: number;
  averageSavings: number;
  commonProjectTypes: Array<{ project_type: string; count: number }>;
}

export default function BudgetOptimizationPage() {
  const [history, setHistory] = useState<OptimizationHistory[]>([]);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch optimization history
      const historyResponse = await fetch('/budget-optimization/history?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.data || []);
      }

      // Fetch statistics
      const statsResponse = await fetch('/budget-optimization/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

    } catch (error) {
      setError('Failed to load budget optimization data');
      console.error('Error fetching budget optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProjectTypeColor = (type: string) => {
    const colors = {
      research: 'bg-blue-100 text-blue-800',
      development: 'bg-purple-100 text-purple-800',
      innovation: 'bg-orange-100 text-orange-800',
      infrastructure: 'bg-gray-100 text-gray-800',
      other: 'bg-pink-100 text-pink-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Budget Optimization</h1>
        <p className="text-gray-600 mt-2">
          Optimize your grant budgets with AI-powered analysis and recommendations
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Optimizations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOptimizations}</p>
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
                <p className="text-sm font-medium text-gray-600">Average Confidence</p>
                <p className="text-2xl font-bold text-green-600">
                  {(stats.averageConfidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Savings</p>
                <p className="text-2xl font-bold text-purple-600">
                  €{stats.averageSavings.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Savings</p>
                <p className="text-2xl font-bold text-orange-600">{stats.optimizationsWithSavings}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Budget Optimizer */}
        <div className="lg:col-span-2">
          <BudgetOptimizer 
            onOptimizationComplete={(result) => {
              // Refresh data after optimization
              fetchData();
            }}
          />
        </div>

        {/* Optimization History and Templates */}
        <div className="space-y-6">
          {/* Recent Optimizations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Optimizations</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOptimization === item.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedOptimization(item.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {item.projectScope?.title || 'Untitled Project'}
                    </h4>
                    {item.analysisResults?.confidenceScore && (
                      <Badge className={getConfidenceColor(item.analysisResults.confidenceScore)}>
                        {(item.analysisResults.confidenceScore * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{item.fundingRules?.fundingBody || 'Unknown'}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {item.projectScope?.projectType && (
                    <div className="mt-2">
                      <Badge className={getProjectTypeColor(item.projectScope.projectType)}>
                        {item.projectScope.projectType}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
              
              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No optimizations yet</p>
                  <p className="text-sm">Start by optimizing your first budget</p>
                </div>
              )}
            </div>
          </Card>

          {/* Common Project Types */}
          {stats?.commonProjectTypes && stats.commonProjectTypes.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Project Types</h3>
              <div className="space-y-2">
                {stats.commonProjectTypes.map((type, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Badge className={getProjectTypeColor(type.project_type)}>
                      {type.project_type}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {type.count} optimization{type.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => {
                  // This would open a template selection modal
                  console.log('Get budget template');
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Get Budget Template
              </Button>
              
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => {
                  // This would open the comparison tool
                  console.log('Compare with similar grants');
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare with Similar Grants
              </Button>
              
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={fetchData}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}