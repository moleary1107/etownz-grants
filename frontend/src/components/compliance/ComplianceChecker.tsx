'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { assistantsService } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Loader2,
  RefreshCw,
  Download,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ComplianceIssue {
  type: 'missing' | 'incomplete' | 'non_compliant';
  section: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestion?: string;
}

interface ComplianceReport {
  overallScore: number;
  issues: ComplianceIssue[];
  suggestions: string[];
  timestamp: string;
  sectionsChecked: number;
  complianceBreakdown: {
    eligibility: number;
    technical: number;
    budget: number;
    impact: number;
    documentation: number;
  };
}

interface ComplianceCheckerProps {
  applicationId?: string;
  grantSchemeId: string;
  grantScheme: {
    name: string;
    fundingBody: string;
    requirements: unknown[];
    eligibilityCriteria: unknown[];
    budgetRules: unknown;
  };
  applicationData: {
    sections?: Record<string, unknown>;
    budget?: unknown;
    organization?: unknown;
    documents?: unknown[];
  };
  onComplianceUpdate?: (report: ComplianceReport) => void;
  className?: string;
}

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({
  applicationId,
  grantSchemeId,
  grantScheme,
  applicationData,
  onComplianceUpdate,
  className = ''
}) => {
  const { toast } = useToast();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  // Initialize thread on mount
  useEffect(() => {
    const initThread = async () => {
      try {
        const result = await assistantsService.createThread('compliance_checker');
        setThreadId(result.threadId);
      } catch (error) {
        console.error('Failed to create compliance thread:', error);
      }
    };
    initThread();
  }, []);

  // Auto-check when data changes
  useEffect(() => {
    if (autoCheckEnabled && threadId && applicationData.sections && Object.keys(applicationData.sections).length > 0) {
      const debounceTimer = setTimeout(() => {
        checkCompliance();
      }, 2000); // 2 second debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [applicationData, threadId, autoCheckEnabled, checkCompliance]);

  const checkCompliance = useCallback(async () => {
    if (!threadId) {
      toast({
        title: "Not ready",
        description: "Compliance checker is initializing",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);

    try {
      const result = await assistantsService.checkCompliance({
        threadId,
        applicationData: {
          ...applicationData,
          applicationId,
          grantSchemeId
        },
        grantScheme
      });

      if (result.success) {
        const report: ComplianceReport = {
          overallScore: result.overallScore,
          issues: result.issues,
          suggestions: result.suggestions,
          timestamp: result.timestamp,
          sectionsChecked: Object.keys(applicationData.sections || {}).length,
          complianceBreakdown: {
            eligibility: calculateSectionScore(result.issues, 'eligibility'),
            technical: calculateSectionScore(result.issues, 'technical'),
            budget: calculateSectionScore(result.issues, 'budget'),
            impact: calculateSectionScore(result.issues, 'impact'),
            documentation: calculateSectionScore(result.issues, 'documentation')
          }
        };

        setComplianceReport(report);
        onComplianceUpdate?.(report);

        if (result.overallScore < 70) {
          toast({
            title: "Compliance issues found",
            description: `Score: ${result.overallScore}%. ${result.issues.length} issues need attention.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Compliance check complete",
            description: `Score: ${result.overallScore}%. ${result.issues.length} minor issues found.`
          });
        }
      }
    } catch (error) {
      toast({
        title: "Compliance check failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  }, [threadId, applicationData, applicationId, grantSchemeId, grantScheme, onComplianceUpdate, toast]);

  const calculateSectionScore = (issues: ComplianceIssue[], section: string): number => {
    const sectionIssues = issues.filter(issue => 
      issue.section.toLowerCase().includes(section.toLowerCase())
    );
    
    if (sectionIssues.length === 0) return 100;
    
    const severityWeights = { high: 30, medium: 15, low: 5 };
    const totalDeduction = sectionIssues.reduce((sum, issue) => 
      sum + (severityWeights[issue.severity] || 0), 0
    );
    
    return Math.max(0, 100 - totalDeduction);
  };

  const exportReport = useCallback(() => {
    if (!complianceReport) return;

    const reportContent = {
      applicationId,
      grantScheme: grantScheme.name,
      timestamp: complianceReport.timestamp,
      overallScore: complianceReport.overallScore,
      issues: complianceReport.issues,
      suggestions: complianceReport.suggestions,
      breakdown: complianceReport.complianceBreakdown
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${applicationId || 'draft'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [complianceReport, applicationId, grantScheme]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'destructive' as const,
      medium: 'secondary' as const,
      low: 'default' as const
    };
    
    return (
      <Badge variant={variants[severity]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Compliance Checker
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time compliance validation for {grantScheme.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoCheckEnabled(!autoCheckEnabled)}
            >
              {autoCheckEnabled ? 'Auto-check ON' : 'Auto-check OFF'}
            </Button>
            <Button
              onClick={checkCompliance}
              disabled={isChecking || !threadId}
              size="sm"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Check Now
                </>
              )}
            </Button>
            {complianceReport && (
              <Button
                onClick={exportReport}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Overall Score */}
        {complianceReport && (
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Overall Compliance Score</h4>
                <span className={`text-3xl font-bold ${getScoreColor(complianceReport.overallScore)}`}>
                  {complianceReport.overallScore}%
                </span>
              </div>
              <Progress value={complianceReport.overallScore} className="h-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{complianceReport.sectionsChecked} sections checked</span>
                <span>{complianceReport.issues.length} issues found</span>
              </div>
            </div>
          </Card>
        )}

        {/* Breakdown by Section */}
        {complianceReport && (
          <Card className="p-4">
            <h4 className="font-medium mb-4">Compliance Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(complianceReport.complianceBreakdown).map(([section, score]) => (
                <div key={section} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{section}</span>
                    <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                      {score}%
                    </span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Issues List */}
        {complianceReport && complianceReport.issues.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Compliance Issues</h4>
              <div className="flex gap-2">
                <Badge variant="destructive">
                  {complianceReport.issues.filter(i => i.severity === 'high').length} Critical
                </Badge>
                <Badge variant="secondary">
                  {complianceReport.issues.filter(i => i.severity === 'medium').length} Major
                </Badge>
                <Badge>
                  {complianceReport.issues.filter(i => i.severity === 'low').length} Minor
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {complianceReport.issues
                .sort((a, b) => {
                  const severityOrder = { high: 0, medium: 1, low: 2 };
                  return severityOrder[a.severity] - severityOrder[b.severity];
                })
                .map((issue, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{issue.section}</span>
                              {getSeverityBadge(issue.severity)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {issue.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection(`issue-${index}`)}
                        >
                          {expandedSections[`issue-${index}`] ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                      
                      {expandedSections[`issue-${index}`] && issue.suggestion && (
                        <Card className="p-3 bg-muted/50">
                          <p className="text-sm">
                            <strong>Suggestion:</strong> {issue.suggestion}
                          </p>
                        </Card>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {complianceReport && complianceReport.suggestions.length > 0 && (
          <Card className="p-4">
            <h4 className="font-medium mb-3">Improvement Suggestions</h4>
            <ul className="space-y-2">
              {complianceReport.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* No Report Yet */}
        {!complianceReport && !isChecking && (
          <Card className="p-8 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No compliance check performed yet. Click &quot;Check Now&quot; to validate your application.
            </p>
          </Card>
        )}

        {/* Loading State */}
        {isChecking && (
          <Card className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">
              Analyzing your application against grant requirements...
            </p>
          </Card>
        )}
      </div>
    </Card>
  );
};