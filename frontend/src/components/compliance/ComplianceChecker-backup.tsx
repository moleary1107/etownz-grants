'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ComplianceIssue {
  field: string;
  requirement: string;
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
  ruleId?: string;
}

interface ComplianceReport {
  applicationId: string;
  overallScore: number;
  issues: ComplianceIssue[];
  suggestions: string[];
  checkedAt: string;
  criticalIssuesCount: number;
  majorIssuesCount: number;
  minorIssuesCount: number;
}

interface ComplianceRule {
  id: string;
  grantSchemeId: string;
  ruleCategory: string;
  ruleDescription: string;
  severity: 'critical' | 'major' | 'minor';
  automatedCheck: boolean;
}

interface ComplianceCheckerProps {
  applicationId?: string;
  grantSchemeId: string;
  sections?: {
    [key: string]: {
      content: string;
      metadata?: any;
    };
  };
  budget?: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      justification?: string;
    }>;
  };
  organizationProfile?: {
    type: string;
    size: string;
    location: string;
    yearsInOperation: number;
  };
  onComplianceUpdate?: (report: ComplianceReport) => void;
}

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({
  applicationId,
  grantSchemeId,
  sections,
  budget,
  organizationProfile,
  onComplianceUpdate
}) => {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    if (grantSchemeId) {
      fetchComplianceRules();
    }
  }, [grantSchemeId]);

  const fetchComplianceRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/compliance/rules/${grantSchemeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRules(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching compliance rules:', error);
    }
  };

  const runComplianceCheck = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      let response;
      if (applicationId) {
        // Check existing application
        response = await fetch(`/compliance/check/${applicationId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Manual check with provided data
        response = await fetch('/compliance/check-manual', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            grantSchemeId,
            sections: sections || {},
            budget,
            organizationProfile
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        const complianceReport = data.data;
        setReport(complianceReport);
        setLastChecked(new Date().toISOString());
        onComplianceUpdate?.(complianceReport);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to check compliance');
      }
    } catch (error) {
      setError('Network error occurred while checking compliance');
      console.error('Compliance check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'major':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'minor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compliance Checker</h2>
            <p className="text-gray-600 mt-1">
              AI-powered compliance checking for grant applications
            </p>
          </div>
          <Button 
            onClick={runComplianceCheck}
            disabled={isChecking}
            className="px-6"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking...
              </>
            ) : (
              'Run Compliance Check'
            )}
          </Button>
        </div>

        {lastChecked && (
          <p className="text-sm text-gray-500">
            Last checked: {new Date(lastChecked).toLocaleString()}
          </p>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </Card>

      {/* Compliance Score */}
      {report && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Compliance Score</h3>
            <span className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}%
            </span>
          </div>
          
          <Progress value={report.overallScore} className="mb-4" />
          
          <div className="flex items-center justify-between">
            <span className={`font-medium ${getScoreColor(report.overallScore)}`}>
              {getScoreStatus(report.overallScore)}
            </span>
            <div className="flex space-x-4 text-sm">
              {report.criticalIssuesCount > 0 && (
                <span className="text-red-600">
                  {report.criticalIssuesCount} Critical
                </span>
              )}
              {report.majorIssuesCount > 0 && (
                <span className="text-orange-600">
                  {report.majorIssuesCount} Major
                </span>
              )}
              {report.minorIssuesCount > 0 && (
                <span className="text-yellow-600">
                  {report.minorIssuesCount} Minor
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Issues List */}
      {report && report.issues.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Compliance Issues</h3>
          <div className="space-y-4">
            {report.issues.map((issue, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity.toUpperCase()}
                    </Badge>
                    <span className="font-medium text-gray-900">
                      {issue.field.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-2">
                  <strong>Requirement:</strong> {issue.requirement}
                </p>
                
                <p className="text-gray-600 text-sm">
                  <strong>Suggestion:</strong> {issue.suggestion}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Suggestions */}
      {report && report.suggestions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-3">
            {report.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">{suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Compliance Rules */}
      {rules.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Compliance Rules</h3>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="border-l-4 border-gray-200 pl-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={getSeverityColor(rule.severity)}>
                    {rule.severity}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {rule.ruleCategory}
                  </span>
                  {rule.automatedCheck && (
                    <Badge className="bg-green-100 text-green-800">
                      Automated
                    </Badge>
                  )}
                </div>
                <p className="text-gray-700 text-sm">{rule.ruleDescription}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Report State */}
      {!report && !isChecking && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Compliance Check Results
          </h3>
          <p className="text-gray-500">
            Run a compliance check to see detailed analysis and recommendations.
          </p>
        </Card>
      )}
    </div>
  );
};

export default ComplianceChecker;