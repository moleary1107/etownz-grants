'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  justification: string;
  isRequired: boolean;
}

interface ProjectScope {
  title: string;
  description: string;
  duration: number;
  teamSize: number;
  projectType: 'research' | 'development' | 'innovation' | 'infrastructure' | 'other';
  industry: string;
  location: string;
  objectives: string[];
}

interface FundingRules {
  fundingBody: string;
  grantScheme: string;
  maxBudget: number;
  minBudget?: number;
  eligibleCategories: string[];
  categoryLimits: Record<string, { maxPercentage?: number; minPercentage?: number; maxAmount?: number }>;
  costTypes: any;
  restrictions: string[];
}

interface OptimizedBudget {
  categories: BudgetCategory[];
  totalAmount: number;
  eligiblePercentage: number;
  warnings: any[];
  justifications: any[];
  recommendations: string[];
  confidenceScore: number;
  comparisonWithSimilar: {
    averageBudget: number;
    successfulRange: { min: number; max: number };
    categoryComparisons: Record<string, any>;
  };
  optimization: {
    originalTotal: number;
    optimizedTotal: number;
    savedAmount: number;
    reallocations: any[];
  };
}

interface BudgetOptimizerProps {
  initialBudget?: BudgetCategory[];
  projectScope?: ProjectScope;
  fundingRules?: FundingRules;
  onOptimizationComplete?: (result: OptimizedBudget) => void;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  initialBudget = [],
  projectScope,
  fundingRules,
  onOptimizationComplete
}) => {
  const [currentBudget, setCurrentBudget] = useState<BudgetCategory[]>(initialBudget);
  const [optimizedBudget, setOptimizedBudget] = useState<OptimizedBudget | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('current');

  // Project scope form state
  const [projectForm, setProjectForm] = useState<ProjectScope>(
    projectScope || {
      title: '',
      description: '',
      duration: 12,
      teamSize: 3,
      projectType: 'research',
      industry: '',
      location: 'Ireland',
      objectives: []
    }
  );

  // Funding rules form state
  const [fundingForm, setFundingForm] = useState<FundingRules>(
    fundingRules || {
      fundingBody: 'Enterprise Ireland',
      grantScheme: 'Innovation Partnership Programme',
      maxBudget: 100000,
      eligibleCategories: ['personnel', 'equipment', 'travel', 'materials'],
      categoryLimits: {
        personnel: { maxPercentage: 70 },
        equipment: { maxPercentage: 30 },
        travel: { maxPercentage: 15 }
      },
      costTypes: {},
      restrictions: []
    }
  );

  useEffect(() => {
    if (initialBudget.length === 0) {
      // Initialize with default budget structure
      setCurrentBudget([
        {
          name: 'Personnel',
          amount: 50000,
          percentage: 50,
          justification: 'Research staff and project management',
          isRequired: true
        },
        {
          name: 'Equipment',
          amount: 25000,
          percentage: 25,
          justification: 'Research equipment and software',
          isRequired: true
        },
        {
          name: 'Travel',
          amount: 15000,
          percentage: 15,
          justification: 'Conference attendance and collaboration',
          isRequired: false
        },
        {
          name: 'Materials',
          amount: 10000,
          percentage: 10,
          justification: 'Research materials and consumables',
          isRequired: false
        }
      ]);
    }
  }, [initialBudget]);

  const addBudgetCategory = () => {
    const newCategory: BudgetCategory = {
      name: 'New Category',
      amount: 0,
      percentage: 0,
      justification: '',
      isRequired: false
    };
    setCurrentBudget([...currentBudget, newCategory]);
  };

  const updateBudgetCategory = (index: number, field: keyof BudgetCategory, value: any) => {
    const updated = [...currentBudget];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate percentages if amount changed
    if (field === 'amount') {
      const total = updated.reduce((sum, cat) => sum + cat.amount, 0);
      updated.forEach(cat => {
        cat.percentage = total > 0 ? (cat.amount / total) * 100 : 0;
      });
    }
    
    setCurrentBudget(updated);
  };

  const removeBudgetCategory = (index: number) => {
    const updated = currentBudget.filter((_, i) => i !== index);
    setCurrentBudget(updated);
  };

  const optimizeBudget = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/budget-optimization/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectScope: projectForm,
          currentBudget,
          fundingRules: fundingForm,
          priorities: ['maximize_success', 'minimize_risk']
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedBudget(data.data);
        setActiveTab('optimized');
        onOptimizationComplete?.(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to optimize budget');
      }
    } catch (error) {
      setError('Network error occurred while optimizing budget');
      console.error('Budget optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getTotalBudget = (budget: BudgetCategory[]) => {
    return budget.reduce((sum, cat) => sum + cat.amount, 0);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Budget Optimizer</h2>
            <p className="text-gray-600 mt-1">
              Optimize your grant budget using AI analysis and successful grant patterns
            </p>
          </div>
          <Button 
            onClick={optimizeBudget}
            disabled={isOptimizing || currentBudget.length === 0}
            className="px-6"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Optimizing...
              </>
            ) : (
              'Optimize Budget'
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Budget</TabsTrigger>
          <TabsTrigger value="optimized" disabled={!optimizedBudget}>
            Optimized Budget
          </TabsTrigger>
          <TabsTrigger value="comparison" disabled={!optimizedBudget}>
            Comparison
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Current Budget Tab */}
        <TabsContent value="current" className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Budget Categories</h3>
              <Button onClick={addBudgetCategory} variant="outline" size="sm">
                Add Category
              </Button>
            </div>

            <div className="space-y-4">
              {currentBudget.map((category, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateBudgetCategory(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (€)
                      </label>
                      <input
                        type="number"
                        value={category.amount}
                        onChange={(e) => updateBudgetCategory(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Percentage
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md">
                        {category.percentage.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        onClick={() => removeBudgetCategory(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Justification
                    </label>
                    <textarea
                      value={category.justification}
                      onChange={(e) => updateBudgetCategory(index, 'justification', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain why this budget allocation is necessary..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Budget:</span>
                <span className="text-xl font-bold text-blue-600">
                  €{getTotalBudget(currentBudget).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Optimized Budget Tab */}
        <TabsContent value="optimized" className="space-y-6">
          {optimizedBudget && (
            <>
              {/* Optimization Summary */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Optimization Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      €{optimizedBudget.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Optimized Total</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getConfidenceColor(optimizedBudget.confidenceScore)}`}>
                      {(optimizedBudget.confidenceScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {getConfidenceLabel(optimizedBudget.confidenceScore)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      €{Math.abs(optimizedBudget.optimization.savedAmount).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {optimizedBudget.optimization.savedAmount >= 0 ? 'Saved' : 'Added'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {optimizedBudget.eligiblePercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Eligible Costs</div>
                  </div>
                </div>
              </Card>

              {/* Optimized Categories */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Optimized Budget Categories</h3>
                
                <div className="space-y-4">
                  {optimizedBudget.categories.map((category, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.justification}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            €{category.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {category.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <Progress value={category.percentage} className="mt-2" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recommendations */}
              {optimizedBudget.recommendations.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
                  <div className="space-y-3">
                    {optimizedBudget.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Warnings */}
              {optimizedBudget.warnings.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Budget Warnings</h3>
                  <div className="space-y-3">
                    {optimizedBudget.warnings.map((warning, index) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={
                            warning.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            warning.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {warning.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{warning.category}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{warning.message}</p>
                        <p className="text-sm text-gray-600">{warning.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {optimizedBudget && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Before vs After Comparison</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Category</th>
                      <th className="text-right py-2">Original</th>
                      <th className="text-right py-2">Optimized</th>
                      <th className="text-right py-2">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimizedBudget.categories.map((optimized, index) => {
                      const original = currentBudget.find(c => c.name === optimized.name);
                      const difference = optimized.amount - (original?.amount || 0);
                      
                      return (
                        <tr key={index} className="border-b">
                          <td className="py-2 font-medium">{optimized.name}</td>
                          <td className="text-right py-2">
                            €{(original?.amount || 0).toLocaleString()}
                          </td>
                          <td className="text-right py-2">
                            €{optimized.amount.toLocaleString()}
                          </td>
                          <td className={`text-right py-2 ${
                            difference > 0 ? 'text-green-600' : 
                            difference < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}€{difference.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Scope */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Project Scope</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Type
                  </label>
                  <select
                    value={projectForm.projectType}
                    onChange={(e) => setProjectForm({...projectForm, projectType: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="research">Research</option>
                    <option value="development">Development</option>
                    <option value="innovation">Innovation</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (months)
                    </label>
                    <input
                      type="number"
                      value={projectForm.duration}
                      onChange={(e) => setProjectForm({...projectForm, duration: parseInt(e.target.value) || 12})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Size
                    </label>
                    <input
                      type="number"
                      value={projectForm.teamSize}
                      onChange={(e) => setProjectForm({...projectForm, teamSize: parseInt(e.target.value) || 3})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Funding Rules */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Funding Rules</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Funding Body
                  </label>
                  <select
                    value={fundingForm.fundingBody}
                    onChange={(e) => setFundingForm({...fundingForm, fundingBody: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Enterprise Ireland">Enterprise Ireland</option>
                    <option value="Science Foundation Ireland">Science Foundation Ireland</option>
                    <option value="Irish Research Council">Irish Research Council</option>
                    <option value="European Commission">European Commission</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grant Scheme
                  </label>
                  <input
                    type="text"
                    value={fundingForm.grantScheme}
                    onChange={(e) => setFundingForm({...fundingForm, grantScheme: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Budget (€)
                  </label>
                  <input
                    type="number"
                    value={fundingForm.maxBudget}
                    onChange={(e) => setFundingForm({...fundingForm, maxBudget: parseFloat(e.target.value) || 100000})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetOptimizer;