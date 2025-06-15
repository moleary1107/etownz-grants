'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { AITransparencyWrapper } from '../ai/AITransparencyWrapper';
import {
  Eye,
  EyeOff,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  TrendingUp,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  category?: string;
}

interface FieldVisibility {
  fieldName: string;
  isVisible: boolean;
  isRequired: boolean;
  visibilityReason: string;
  ruleId?: string;
  recommendationId?: string;
}

interface FormAnalysis {
  recommendedFields: string[];
  optionalFields: string[];
  fieldVisibility: Record<string, FieldVisibility>;
  nextSuggestedField?: string;
  completionEstimate: number;
  recommendations: FieldRecommendation[];
}

interface FieldRecommendation {
  id: string;
  fieldName: string;
  recommendationType: 'show_next' | 'skip_optional' | 'provide_help' | 'suggest_value' | 'validate_input';
  recommendationText: string;
  confidenceScore?: number;
}

interface ProgressiveFormDisclosureProps {
  fields: FieldDefinition[];
  formData: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
  grantSchemeId?: string;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  className?: string;
}

export const ProgressiveFormDisclosure: React.FC<ProgressiveFormDisclosureProps> = ({
  fields,
  formData,
  onDataChange,
  grantSchemeId,
  sessionId: initialSessionId,
  onSessionCreated,
  className = ''
}) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']));
  const [fieldInteractions, setFieldInteractions] = useState<Record<string, number>>({});
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  
  const interactionTimers = useRef<Record<string, number>>({});
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize session on mount
  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    }
  }, [initializeSession, sessionId]);

  // Analyze form whenever data changes
  useEffect(() => {
    if (sessionId && Object.keys(formData).length > 0) {
      // Debounce analysis
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      
      analysisTimeoutRef.current = setTimeout(() => {
        analyzeFormProgress();
      }, 1000);
    }
  }, [formData, sessionId, analyzeFormProgress]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/progressive-form/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          grantSchemeId,
          sessionType: 'application_form',
          fieldsTotal: fields.length,
          userAgent: navigator.userAgent,
          metadata: { formType: 'progressive_disclosure' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSessionId(result.sessionId);
        onSessionCreated?.(result.sessionId);
      }
    } catch (error) {
      console.error('Failed to initialize form session:', error);
    }
  };

  const analyzeFormProgress = async () => {
    if (!sessionId) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/progressive-form/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          formData,
          grantSchemeId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Failed to analyze form progress:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const trackFieldInteraction = async (
    fieldName: string,
    interactionType: string,
    fieldValue?: string,
    additionalData?: Record<string, unknown>
  ) => {
    if (!sessionId) return;

    try {
      await fetch('/api/progressive-form/interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          fieldName,
          fieldType: getFieldType(fieldName),
          interactionType,
          fieldValue,
          timeSpentSeconds: fieldInteractions[fieldName] || 0,
          ...additionalData
        })
      });
    } catch (error) {
      console.error('Failed to track field interaction:', error);
    }
  };

  const handleFieldFocus = useCallback((fieldName: string) => {
    interactionTimers.current[fieldName] = Date.now();
    trackFieldInteraction(fieldName, 'focus');
  }, [sessionId]);

  const handleFieldBlur = useCallback((fieldName: string, value: string) => {
    const startTime = interactionTimers.current[fieldName];
    if (startTime) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      setFieldInteractions(prev => ({ ...prev, [fieldName]: timeSpent }));
      delete interactionTimers.current[fieldName];
    }
    
    trackFieldInteraction(fieldName, 'blur', value);
  }, [trackFieldInteraction]);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    const newData = { ...formData, [fieldName]: value };
    onDataChange(newData);
    trackFieldInteraction(fieldName, 'change', String(value));
  }, [formData, onDataChange, trackFieldInteraction]);

  const handleRecommendationAction = async (recommendationId: string, action: 'accepted' | 'rejected' | 'ignored') => {
    try {
      await fetch(`/api/progressive-form/recommendation/${recommendationId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });

      if (action === 'rejected' || action === 'ignored') {
        setDismissedRecommendations(prev => new Set([...prev, recommendationId]));
      }
    } catch (error) {
      console.error('Failed to record recommendation action:', error);
    }
  };

  const getFieldType = (fieldName: string): string => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'text';
  };

  const isFieldVisible = (fieldName: string): boolean => {
    if (!analysis) return fields.find(f => f.name === fieldName)?.category === 'basic';
    return analysis.fieldVisibility[fieldName]?.isVisible || false;
  };

  const isFieldRequired = (fieldName: string): boolean => {
    if (!analysis) return fields.find(f => f.name === fieldName)?.required || false;
    return analysis.fieldVisibility[fieldName]?.isRequired || false;
  };

  const getVisibilityReason = (fieldName: string): string => {
    return analysis?.fieldVisibility[fieldName]?.visibilityReason || 'default';
  };

  const categorizeFields = () => {
    const categories: Record<string, FieldDefinition[]> = {};
    
    fields.forEach(field => {
      const category = field.category || 'other';
      if (!categories[category]) categories[category] = [];
      categories[category].push(field);
    });

    return categories;
  };

  const getVisibleRecommendations = () => {
    if (!analysis || !showRecommendations) return [];
    return analysis.recommendations.filter(rec => !dismissedRecommendations.has(rec.id));
  };

  const renderField = (field: FieldDefinition) => {
    const visible = isFieldVisible(field.name);
    const required = isFieldRequired(field.name);
    const value = formData[field.name] || '';
    const visibilityReason = getVisibilityReason(field.name);
    const isHighlighted = analysis?.nextSuggestedField === field.name;

    if (!visible) return null;

    const fieldComponent = (
      <div
        className={`mb-4 transition-all duration-300 ${
          isHighlighted ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-2' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {isHighlighted && (
              <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
                Suggested Next
              </Badge>
            )}
          </label>
          
          <div className="flex items-center space-x-1">
            {visibilityReason === 'rule_triggered' && (
              <Badge variant="outline" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Smart Show
              </Badge>
            )}
            {visibilityReason === 'ai_recommendation' && (
              <Badge variant="outline" className="text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                AI Suggested
              </Badge>
            )}
            {field.helpText && (
              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
            )}
          </div>
        </div>

        {field.type === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onFocus={() => handleFieldFocus(field.name)}
            onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={required && !value ? 'border-orange-300' : ''}
          />
        ) : field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onFocus={() => handleFieldFocus(field.name)}
            onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
            className={`w-full p-2 border rounded-md ${required && !value ? 'border-orange-300' : 'border-gray-300'}`}
          >
            <option value="">Select an option...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            onFocus={() => handleFieldFocus(field.name)}
            onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={required && !value ? 'border-orange-300' : ''}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )}

        {field.helpText && (
          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
        )}
      </div>
    );

    // Wrap with AI transparency if this field was shown by AI
    if (visibilityReason === 'ai_recommendation') {
      return (
        <AITransparencyWrapper
          key={field.name}
          confidence={0.85}
          model="gpt-4o-mini"
          reasoning={`Field suggested based on form progress analysis`}
        >
          {fieldComponent}
        </AITransparencyWrapper>
      );
    }

    return <div key={field.name}>{fieldComponent}</div>;
  };

  const renderCategorySection = (categoryName: string, categoryFields: FieldDefinition[]) => {
    const isExpanded = expandedCategories.has(categoryName);
    const visibleFields = categoryFields.filter(field => isFieldVisible(field.name));
    const completedFields = visibleFields.filter(field => formData[field.name] && formData[field.name] !== '');
    
    if (visibleFields.length === 0) return null;

    const progress = visibleFields.length > 0 ? (completedFields.length / visibleFields.length) * 100 : 0;

    return (
      <Card key={categoryName} className="mb-4">
        <div
          className="p-4 cursor-pointer border-b hover:bg-gray-50"
          onClick={() => {
            const newExpanded = new Set(expandedCategories);
            if (isExpanded) {
              newExpanded.delete(categoryName);
            } else {
              newExpanded.add(categoryName);
            }
            setExpandedCategories(newExpanded);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
              <h3 className="text-lg font-medium capitalize">
                {categoryName.replace('_', ' ')}
              </h3>
              <Badge variant="outline">
                {completedFields.length}/{visibleFields.length}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 text-right text-sm text-gray-600">
                {Math.round(progress)}%
              </div>
              <Progress value={progress} className="w-20 h-2" />
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4">
            {categoryFields.map(renderField)}
          </div>
        )}
      </Card>
    );
  };

  const categories = categorizeFields();
  const visibleRecommendations = getVisibleRecommendations();
  const overallProgress = analysis?.completionEstimate || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Form Progress</h2>
          <div className="flex items-center space-x-2">
            {isAnalyzing && <Clock className="h-4 w-4 animate-spin text-blue-600" />}
            <span className="text-sm text-gray-600">{overallProgress}% Complete</span>
          </div>
        </div>
        
        <Progress value={overallProgress} className="h-3 mb-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Required: {analysis?.recommendedFields.length || 0}</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span>Optional: {analysis?.optionalFields.length || 0}</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Completion: {Math.round(overallProgress)}%</span>
          </div>
        </div>
      </Card>

      {/* AI Recommendations */}
      {visibleRecommendations.length > 0 && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium flex items-center">
              <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
              AI Recommendations
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecommendations(!showRecommendations)}
            >
              {showRecommendations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="space-y-2">
            {visibleRecommendations.map((recommendation) => (
              <div key={recommendation.id} className="flex items-start justify-between p-3 bg-white rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{recommendation.recommendationText}</p>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {recommendation.recommendationType.replace('_', ' ')}
                    </Badge>
                    {recommendation.confidenceScore && (
                      <span className="text-xs text-gray-500">
                        {Math.round(recommendation.confidenceScore * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 ml-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRecommendationAction(recommendation.id, 'accepted')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRecommendationAction(recommendation.id, 'rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Form Sections */}
      <div className="space-y-4">
        {Object.entries(categories).map(([categoryName, categoryFields]) =>
          renderCategorySection(categoryName, categoryFields)
        )}
      </div>
    </div>
  );
};