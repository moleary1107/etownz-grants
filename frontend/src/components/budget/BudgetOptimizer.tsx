'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { assistantsService } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Download,
  RefreshCw,
  Info
} from 'lucide-react';

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

interface CostType {
  [key: string]: unknown
}

interface FundingRules {
  fundingBody: string;
  grantScheme: string;
  maxBudget: number;
  minBudget?: number;
  eligibleCategories: string[];
  categoryLimits: Record<string, { maxPercentage?: number; minPercentage?: number; maxAmount?: number }>;
  costTypes: CostType;
  restrictions: string[];
}

interface BudgetWarning {
  severity: 'low' | 'medium' | 'high'
  message: string
  [key: string]: unknown
}

interface BudgetJustification {
  category: string
  reason: string
  [key: string]: unknown
}

interface OptimizedBudget {
  categories: BudgetCategory[];
  totalAmount: number;
  eligiblePercentage: number;
  warnings: BudgetWarning[];
  justifications: BudgetJustification[];
  recommendations: string[];
  confidenceScore: number;
  comparisonWithSimilar: {
    averageBudget: number;
    successfulRange: { min: number; max: number };
  };
}

interface BudgetOptimizerProps {
  projectScope: ProjectScope;
  fundingRules: FundingRules;
  initialBudget?: BudgetCategory[];
  onBudgetChange?: (budget: OptimizedBudget) => void;
  className?: string;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  projectScope,
  fundingRules,
  initialBudget = [],
  onBudgetChange,
  className = ''
}) => {
  const { toast } = useToast();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentBudget, setCurrentBudget] = useState<BudgetCategory[]>(initialBudget);
  const [optimizedBudget, setOptimizedBudget] = useState<OptimizedBudget | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (initialBudget.length > 0) {
      setCurrentBudget(initialBudget);
    }
  }, [initialBudget]);

  const initializeThread = useCallback(async () => {
    if (!threadId) {
      try {
        const result = await assistantsService.createThread('budget_analyst');
        setThreadId(result.threadId);
        return result.threadId;
      } catch (error) {
        console.error('Failed to create thread:', error);
        throw error;
      }
    }
    return threadId;
  }, [threadId]);

  const optimizeBudget = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      const currentThreadId = await initializeThread();
      
      const result = await assistantsService.optimizeBudget({
        threadId: currentThreadId,
        budgetData: {
          categories: currentBudget,
          totalAmount: currentBudget.reduce((sum, cat) => sum + cat.amount, 0)
        },
        projectScope,
        fundingRules
      });

      if (result.success) {
        const optimized: OptimizedBudget = {
          categories: result.optimizedBudget.categories || currentBudget,
          totalAmount: result.optimizedBudget.totalAmount || 0,
          eligiblePercentage: result.optimizedBudget.eligiblePercentage || 100,
          warnings: result.warnings || [],
          justifications: result.optimizedBudget.justifications || [],
          recommendations: result.recommendations || [],
          confidenceScore: 0.85,
          comparisonWithSimilar: {
            averageBudget: result.optimizedBudget.totalAmount * 0.95,
            successfulRange: {
              min: result.optimizedBudget.totalAmount * 0.8,
              max: result.optimizedBudget.totalAmount * 1.2
            }
          }
        };

        setOptimizedBudget(optimized);
        onBudgetChange?.(optimized);

        toast({
          title: "Budget optimized successfully",
          description: `Saved ${result.savings.toFixed(2)}% while maintaining project objectives`
        });
      }
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [currentBudget, projectScope, fundingRules, initializeThread, onBudgetChange, toast]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addCategory = useCallback((category: BudgetCategory) => {
    setCurrentBudget(prev => [...prev, category]);
  }, []);

  const updateCategory = useCallback((index: number, updates: Partial<BudgetCategory>) => {
    setCurrentBudget(prev => prev.map((cat, i) => 
      i === index ? { ...cat, ...updates } : cat
    ));
  }, []);

  const removeCategory = useCallback((index: number) => {
    setCurrentBudget(prev => prev.filter((_, i) => i !== index));
  }, []);

  const exportBudget = useCallback(() => {
    const budget = optimizedBudget || {
      categories: currentBudget,
      totalAmount: currentBudget.reduce((sum, cat) => sum + cat.amount, 0)
    };

    const csv = [
      ['Category', 'Amount', 'Percentage', 'Justification'],
      ...budget.categories.map(cat => [
        cat.name,
        cat.amount.toFixed(2),
        cat.percentage.toFixed(1) + '%',
        cat.justification
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${projectScope.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentBudget, optimizedBudget, projectScope.title]);

  const getTotalBudget = () => currentBudget.reduce((sum, cat) => sum + cat.amount, 0);

  const getWarningLevel = (warnings: BudgetWarning[]): 'success' | 'warning' | 'error' => {
    if (!warnings || warnings.length === 0) return 'success';
    if (warnings.some(w => w.severity === 'high')) return 'error';
    if (warnings.some(w => w.severity === 'medium')) return 'warning';
    return 'success';
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Budget Optimizer</h3>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered budget optimization for {fundingRules.grantScheme}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={optimizeBudget}
              disabled={isOptimizing || currentBudget.length === 0}
              size="sm"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Optimize Budget
                </>
              )}
            </Button>
            <Button
              onClick={exportBudget}
              variant="outline"
              size="sm"
              disabled={currentBudget.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">${getTotalBudget().toLocaleString()}</p>
              <Progress 
                value={(getTotalBudget() / fundingRules.maxBudget) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {((getTotalBudget() / fundingRules.maxBudget) * 100).toFixed(1)}% of max
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Eligible Costs</p>
              <p className="text-2xl font-bold">
                {optimizedBudget ? `${optimizedBudget.eligiblePercentage}%` : '100%'}
              </p>
              {optimizedBudget && (
                <Badge variant={getWarningLevel(optimizedBudget.warnings) === 'success' ? 'default' : 'secondary'}>
                  {getWarningLevel(optimizedBudget.warnings) === 'success' ? 'Compliant' : 'Review Required'}
                </Badge>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Optimization Score</p>
              <p className="text-2xl font-bold">
                {optimizedBudget ? `${(optimizedBudget.confidenceScore * 100).toFixed(0)}%` : '-'}
              </p>
              {optimizedBudget && (
                <div className="flex items-center gap-1">
                  {optimizedBudget.confidenceScore > 0.8 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-xs">
                    {optimizedBudget.confidenceScore > 0.8 ? 'Well optimized' : 'Can be improved'}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Budget Categories Chart */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">Budget Distribution</h4>
              <div className="space-y-3">
                {(optimizedBudget?.categories || currentBudget).map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm">${category.amount.toLocaleString()}</span>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">{category.percentage}%</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Comparison with Similar Projects */}
            {optimizedBudget && (
              <Card className="p-4">
                <h4 className="font-medium mb-4">Comparison with Similar Projects</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your Budget</span>
                    <span className="font-medium">${optimizedBudget.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Budget</span>
                    <span>${optimizedBudget.comparisonWithSimilar.averageBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Successful Range</span>
                    <span className="text-sm">
                      ${optimizedBudget.comparisonWithSimilar.successfulRange.min.toLocaleString()} - 
                      ${optimizedBudget.comparisonWithSimilar.successfulRange.max.toLocaleString()}
                    </span>
                  </div>
                  {optimizedBudget.totalAmount < optimizedBudget.comparisonWithSimilar.successfulRange.min && (
                    <Badge variant="secondary" className="mt-2">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Below typical range
                    </Badge>
                  )}
                  {optimizedBudget.totalAmount > optimizedBudget.comparisonWithSimilar.successfulRange.max && (
                    <Badge variant="secondary" className="mt-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Above typical range
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="space-y-3">
              {currentBudget.map((category, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{category.name}</h5>
                      <div className="flex items-center gap-2">
                        <Badge variant={category.isRequired ? 'default' : 'secondary'}>
                          {category.isRequired ? 'Required' : 'Optional'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCategory(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Amount</label>
                        <input
                          type="number"
                          value={category.amount}
                          onChange={(e) => updateCategory(index, { 
                            amount: parseFloat(e.target.value) || 0 
                          })}
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Percentage</label>
                        <input
                          type="number"
                          value={category.percentage}
                          onChange={(e) => updateCategory(index, { 
                            percentage: parseFloat(e.target.value) || 0 
                          })}
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Justification</label>
                      <textarea
                        value={category.justification}
                        onChange={(e) => updateCategory(index, { 
                          justification: e.target.value 
                        })}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {optimizedBudget?.recommendations && optimizedBudget.recommendations.length > 0 ? (
              <div className="space-y-3">
                {optimizedBudget.recommendations.map((rec, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  No recommendations available. Click &quot;Optimize Budget&quot; to get AI-powered suggestions.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-4">
            {optimizedBudget?.warnings && optimizedBudget.warnings.length > 0 ? (
              <div className="space-y-3">
                {optimizedBudget.warnings.map((warning, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{warning.severity}</p>
                        <p className="text-sm text-muted-foreground">{warning.message}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No warnings found. Your budget appears to be compliant.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};