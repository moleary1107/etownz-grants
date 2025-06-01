'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Upload, 
  X, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  Calendar,
  Building,
  FileText,
  Users,
  Target
} from 'lucide-react';

interface Grant {
  id: string;
  title: string;
  description: string;
  funder: string;
  amount_min: number;
  amount_max: number;
  currency: string;
  deadline: string;
  categories: string[];
  eligibility_criteria: any;
  required_documents: string[];
  application_process: string;
  url: string;
  is_active: boolean;
}

interface ApplicationData {
  grant_id: string;
  project_title: string;
  project_description: string;
  requested_amount: number;
  project_duration: number;
  application_data: {
    team_size: number;
    technical_approach: string;
    expected_outcomes: string[];
    budget_breakdown: {
      personnel: number;
      equipment: number;
      operations: number;
      other: number;
    };
    timeline: {
      phase: string;
      duration: number;
      deliverables: string[];
    }[];
    risk_assessment: {
      risk: string;
      impact: string;
      mitigation: string;
    }[];
    success_metrics: string[];
    sustainability_plan: string;
  };
}

export default function CreateApplication() {
  const router = useRouter();
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [availableGrants, setAvailableGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    grant_id: '',
    project_title: '',
    project_description: '',
    requested_amount: 0,
    project_duration: 12,
    application_data: {
      team_size: 1,
      technical_approach: '',
      expected_outcomes: [''],
      budget_breakdown: {
        personnel: 0,
        equipment: 0,
        operations: 0,
        other: 0
      },
      timeline: [{
        phase: 'Planning',
        duration: 3,
        deliverables: ['']
      }],
      risk_assessment: [{
        risk: '',
        impact: '',
        mitigation: ''
      }],
      success_metrics: [''],
      sustainability_plan: ''
    }
  });

  useEffect(() => {
    loadAvailableGrants();
  }, []);

  const loadAvailableGrants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/grants?limit=50');
      const data = await response.json();
      setAvailableGrants(data.grants || []);
    } catch (error) {
      console.error('Failed to load grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationData = (path: string, value: any) => {
    setApplicationData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addArrayItem = (path: string, defaultValue: any) => {
    const current = getNestedValue(applicationData, path) || [];
    updateApplicationData(path, [...current, defaultValue]);
  };

  const removeArrayItem = (path: string, index: number) => {
    const current = getNestedValue(applicationData, path) || [];
    const newArray = current.filter((_: any, i: number) => i !== index);
    updateApplicationData(path, newArray);
  };

  const updateArrayItem = (path: string, index: number, value: any) => {
    const current = getNestedValue(applicationData, path) || [];
    const newArray = [...current];
    newArray[index] = value;
    updateApplicationData(path, newArray);
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (stepNumber) {
      case 1:
        if (!selectedGrant) newErrors.grant = 'Please select a grant';
        if (!applicationData.project_title.trim()) newErrors.project_title = 'Project title is required';
        if (!applicationData.project_description.trim()) newErrors.project_description = 'Project description is required';
        if (applicationData.requested_amount <= 0) newErrors.requested_amount = 'Requested amount must be greater than 0';
        if (applicationData.project_duration <= 0) newErrors.project_duration = 'Project duration must be greater than 0';
        break;
      
      case 2:
        if (!applicationData.application_data.technical_approach.trim()) {
          newErrors.technical_approach = 'Technical approach is required';
        }
        if (applicationData.application_data.team_size <= 0) {
          newErrors.team_size = 'Team size must be greater than 0';
        }
        break;
      
      case 3:
        const budget = applicationData.application_data.budget_breakdown;
        const total = budget.personnel + budget.equipment + budget.operations + budget.other;
        if (total !== applicationData.requested_amount) {
          newErrors.budget = `Budget breakdown (${total}) must equal requested amount (${applicationData.requested_amount})`;
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...applicationData,
          grant_id: selectedGrant?.id,
          status: 'draft'
        })
      });

      if (response.ok) {
        router.push('/dashboard/applications');
      } else {
        throw new Error('Failed to save application');
      }
    } catch (error) {
      console.error('Failed to save application:', error);
      alert('Failed to save application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitApplication = async () => {
    if (!validateStep(step)) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...applicationData,
          grant_id: selectedGrant?.id,
          status: 'submitted'
        })
      });

      if (response.ok) {
        router.push('/dashboard/applications?success=true');
      } else {
        throw new Error('Failed to submit application');
      }
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNumber) => (
        <div key={stepNumber} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
          `}>
            {step > stepNumber ? <CheckCircle className="h-4 w-4" /> : stepNumber}
          </div>
          {stepNumber < 4 && (
            <div className={`w-16 h-1 ${step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderGrantSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Select Grant & Basic Information
        </CardTitle>
        <CardDescription>Choose the grant you want to apply for and provide basic project details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grant Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Available Grants</label>
          {loading ? (
            <div className="text-center py-4">Loading grants...</div>
          ) : (
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {availableGrants.map(grant => (
                <div
                  key={grant.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedGrant?.id === grant.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedGrant(grant);
                    updateApplicationData('grant_id', grant.id);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{grant.title}</h3>
                    <Badge variant="outline">{grant.funder}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{grant.description.substring(0, 150)}...</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {grant.amount_min.toLocaleString()} - {grant.amount_max.toLocaleString()} {grant.currency}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(grant.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.grant && <p className="text-red-500 text-sm mt-1">{errors.grant}</p>}
        </div>

        {selectedGrant && (
          <>
            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Project Title *</label>
              <Input
                value={applicationData.project_title}
                onChange={(e) => updateApplicationData('project_title', e.target.value)}
                placeholder="Enter your project title"
                className={errors.project_title ? 'border-red-500' : ''}
              />
              {errors.project_title && <p className="text-red-500 text-sm mt-1">{errors.project_title}</p>}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Project Description *</label>
              <Textarea
                value={applicationData.project_description}
                onChange={(e) => updateApplicationData('project_description', e.target.value)}
                placeholder="Provide a detailed description of your project"
                rows={4}
                className={errors.project_description ? 'border-red-500' : ''}
              />
              {errors.project_description && <p className="text-red-500 text-sm mt-1">{errors.project_description}</p>}
            </div>

            {/* Requested Amount and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Requested Amount ({selectedGrant.currency}) *</label>
                <Input
                  type="number"
                  value={applicationData.requested_amount}
                  onChange={(e) => updateApplicationData('requested_amount', Number(e.target.value))}
                  min={selectedGrant.amount_min}
                  max={selectedGrant.amount_max}
                  className={errors.requested_amount ? 'border-red-500' : ''}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Range: {selectedGrant.amount_min.toLocaleString()} - {selectedGrant.amount_max.toLocaleString()}
                </p>
                {errors.requested_amount && <p className="text-red-500 text-sm mt-1">{errors.requested_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Duration (months) *</label>
                <Input
                  type="number"
                  value={applicationData.project_duration}
                  onChange={(e) => updateApplicationData('project_duration', Number(e.target.value))}
                  min={1}
                  max={60}
                  className={errors.project_duration ? 'border-red-500' : ''}
                />
                {errors.project_duration && <p className="text-red-500 text-sm mt-1">{errors.project_duration}</p>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderTechnicalDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Technical Approach & Team
        </CardTitle>
        <CardDescription>Describe your technical approach and team composition</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Technical Approach */}
        <div>
          <label className="block text-sm font-medium mb-2">Technical Approach *</label>
          <Textarea
            value={applicationData.application_data.technical_approach}
            onChange={(e) => updateApplicationData('application_data.technical_approach', e.target.value)}
            placeholder="Describe your technical methodology, tools, and approach"
            rows={6}
            className={errors.technical_approach ? 'border-red-500' : ''}
          />
          {errors.technical_approach && <p className="text-red-500 text-sm mt-1">{errors.technical_approach}</p>}
        </div>

        {/* Team Size */}
        <div>
          <label className="block text-sm font-medium mb-2">Team Size *</label>
          <Input
            type="number"
            value={applicationData.application_data.team_size}
            onChange={(e) => updateApplicationData('application_data.team_size', Number(e.target.value))}
            min={1}
            className={errors.team_size ? 'border-red-500' : ''}
          />
          {errors.team_size && <p className="text-red-500 text-sm mt-1">{errors.team_size}</p>}
        </div>

        {/* Expected Outcomes */}
        <div>
          <label className="block text-sm font-medium mb-2">Expected Outcomes</label>
          {applicationData.application_data.expected_outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={outcome}
                onChange={(e) => updateArrayItem('application_data.expected_outcomes', index, e.target.value)}
                placeholder={`Expected outcome ${index + 1}`}
              />
              {applicationData.application_data.expected_outcomes.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('application_data.expected_outcomes', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('application_data.expected_outcomes', '')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Outcome
          </Button>
        </div>

        {/* Success Metrics */}
        <div>
          <label className="block text-sm font-medium mb-2">Success Metrics</label>
          {applicationData.application_data.success_metrics.map((metric, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={metric}
                onChange={(e) => updateArrayItem('application_data.success_metrics', index, e.target.value)}
                placeholder={`Success metric ${index + 1}`}
              />
              {applicationData.application_data.success_metrics.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('application_data.success_metrics', index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('application_data.success_metrics', '')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Metric
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderBudgetTimeline = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Budget & Timeline
        </CardTitle>
        <CardDescription>Break down your budget and project timeline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Breakdown */}
        <div>
          <label className="block text-sm font-medium mb-4">Budget Breakdown *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Personnel</label>
              <Input
                type="number"
                value={applicationData.application_data.budget_breakdown.personnel}
                onChange={(e) => updateApplicationData('application_data.budget_breakdown.personnel', Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Equipment</label>
              <Input
                type="number"
                value={applicationData.application_data.budget_breakdown.equipment}
                onChange={(e) => updateApplicationData('application_data.budget_breakdown.equipment', Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Operations</label>
              <Input
                type="number"
                value={applicationData.application_data.budget_breakdown.operations}
                onChange={(e) => updateApplicationData('application_data.budget_breakdown.operations', Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Other</label>
              <Input
                type="number"
                value={applicationData.application_data.budget_breakdown.other}
                onChange={(e) => updateApplicationData('application_data.budget_breakdown.other', Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          
          {/* Budget Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Budget:</span>
              <span className="font-bold">
                {Object.values(applicationData.application_data.budget_breakdown).reduce((a, b) => a + b, 0).toLocaleString()} {selectedGrant?.currency}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Requested Amount:</span>
              <span>{applicationData.requested_amount.toLocaleString()} {selectedGrant?.currency}</span>
            </div>
          </div>
          {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
        </div>

        {/* Project Timeline */}
        <div>
          <label className="block text-sm font-medium mb-2">Project Timeline</label>
          {applicationData.application_data.timeline.map((phase, index) => (
            <Card key={index} className="mb-4">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">Phase {index + 1}</h4>
                  {applicationData.application_data.timeline.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('application_data.timeline', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phase Name</label>
                    <Input
                      value={phase.phase}
                      onChange={(e) => updateArrayItem('application_data.timeline', index, { ...phase, phase: e.target.value })}
                      placeholder="Phase name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Duration (months)</label>
                    <Input
                      type="number"
                      value={phase.duration}
                      onChange={(e) => updateArrayItem('application_data.timeline', index, { ...phase, duration: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Deliverables</label>
                  {phase.deliverables.map((deliverable, dIndex) => (
                    <div key={dIndex} className="flex gap-2 mb-2">
                      <Input
                        value={deliverable}
                        onChange={(e) => {
                          const newDeliverables = [...phase.deliverables];
                          newDeliverables[dIndex] = e.target.value;
                          updateArrayItem('application_data.timeline', index, { ...phase, deliverables: newDeliverables });
                        }}
                        placeholder={`Deliverable ${dIndex + 1}`}
                      />
                      {phase.deliverables.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newDeliverables = phase.deliverables.filter((_, i) => i !== dIndex);
                            updateArrayItem('application_data.timeline', index, { ...phase, deliverables: newDeliverables });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDeliverables = [...phase.deliverables, ''];
                      updateArrayItem('application_data.timeline', index, { ...phase, deliverables: newDeliverables });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deliverable
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('application_data.timeline', {
              phase: `Phase ${applicationData.application_data.timeline.length + 1}`,
              duration: 3,
              deliverables: ['']
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Phase
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewSubmit = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Review & Submit
        </CardTitle>
        <CardDescription>Review your application before submission</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Application Summary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Application Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Grant:</strong> {selectedGrant?.title}
            </div>
            <div>
              <strong>Funder:</strong> {selectedGrant?.funder}
            </div>
            <div>
              <strong>Project Title:</strong> {applicationData.project_title}
            </div>
            <div>
              <strong>Requested Amount:</strong> {applicationData.requested_amount.toLocaleString()} {selectedGrant?.currency}
            </div>
            <div>
              <strong>Duration:</strong> {applicationData.project_duration} months
            </div>
            <div>
              <strong>Team Size:</strong> {applicationData.application_data.team_size} members
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <label className="block text-sm font-medium mb-2">Risk Assessment</label>
          {applicationData.application_data.risk_assessment.map((risk, index) => (
            <Card key={index} className="mb-4">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">Risk {index + 1}</h4>
                  {applicationData.application_data.risk_assessment.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('application_data.risk_assessment', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Risk Description</label>
                    <Input
                      value={risk.risk}
                      onChange={(e) => updateArrayItem('application_data.risk_assessment', index, { ...risk, risk: e.target.value })}
                      placeholder="Describe the risk"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Impact</label>
                    <Input
                      value={risk.impact}
                      onChange={(e) => updateArrayItem('application_data.risk_assessment', index, { ...risk, impact: e.target.value })}
                      placeholder="Describe the potential impact"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Mitigation Strategy</label>
                    <Input
                      value={risk.mitigation}
                      onChange={(e) => updateArrayItem('application_data.risk_assessment', index, { ...risk, mitigation: e.target.value })}
                      placeholder="How will you mitigate this risk?"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => addArrayItem('application_data.risk_assessment', {
              risk: '',
              impact: '',
              mitigation: ''
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Risk
          </Button>
        </div>

        {/* Sustainability Plan */}
        <div>
          <label className="block text-sm font-medium mb-2">Sustainability Plan</label>
          <Textarea
            value={applicationData.application_data.sustainability_plan}
            onChange={(e) => updateApplicationData('application_data.sustainability_plan', e.target.value)}
            placeholder="Describe how the project will be sustained after the grant period"
            rows={4}
          />
        </div>

        {/* Final Validation */}
        {Object.keys(errors).length > 0 && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Please fix the following errors:</span>
            </div>
            <ul className="text-sm text-red-600 list-disc list-inside">
              {Object.values(errors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Application</h1>
          <p className="text-gray-600">Submit a new grant application</p>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="mb-8">
        {step === 1 && renderGrantSelection()}
        {step === 2 && renderTechnicalDetails()}
        {step === 3 && renderBudgetTimeline()}
        {step === 4 && renderReviewSubmit()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveAsDraft}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>

          {step < 4 ? (
            <Button onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button onClick={submitApplication} disabled={saving}>
              <Send className="h-4 w-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}