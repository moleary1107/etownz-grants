'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from '../../lib/hooks/use-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Users, 
  BarChart3,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface ReviewWorkflow {
  id: number;
  name: string;
  description?: string;
  type: 'application' | 'document' | 'budget' | 'compliance';
  organizationId?: number;
  isActive: boolean;
  requiredApprovers: number;
  sequentialApproval: boolean;
  createdAt: string;
}

interface WorkflowMetrics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageProcessingTime: number;
}

export default function WorkflowManagement() {
  const [workflows, setWorkflows] = useState<ReviewWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ReviewWorkflow | null>(null);
  const [workflowMetrics, setWorkflowMetrics] = useState<{ [key: number]: WorkflowMetrics }>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'application' as const,
    requiredApprovers: 1,
    sequentialApproval: false,
    isActive: true
  });

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/review-approval/workflows', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const result = await response.json();
      setWorkflows(result.data || []);

      // Fetch metrics for each workflow
      result.data?.forEach((workflow: ReviewWorkflow) => {
        fetchWorkflowMetrics(workflow.id);
      });
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflows',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowMetrics = async (workflowId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/workflows/${workflowId}/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflowMetrics(prev => ({
          ...prev,
          [workflowId]: result.data
        }));
      }
    } catch (error) {
      console.error(`Error fetching metrics for workflow ${workflowId}:`, error);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/review-approval/workflows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create workflow');
      }

      await response.json();
      
      toast({
        title: 'Success',
        description: 'Workflow created successfully',
        variant: 'default'
      });

      setCreateMode(false);
      resetForm();
      await fetchWorkflows();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create workflow',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/workflows/${selectedWorkflow.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update workflow');
      }

      toast({
        title: 'Success',
        description: 'Workflow updated successfully',
        variant: 'default'
      });

      setEditMode(false);
      setSelectedWorkflow(null);
      resetForm();
      await fetchWorkflows();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update workflow',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete workflow');
      }

      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
        variant: 'default'
      });

      await fetchWorkflows();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete workflow',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'application',
      requiredApprovers: 1,
      sequentialApproval: false,
      isActive: true
    });
  };

  const startEdit = (workflow: ReviewWorkflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      type: workflow.type,
      requiredApprovers: workflow.requiredApprovers,
      sequentialApproval: workflow.sequentialApproval,
      isActive: workflow.isActive
    });
    setEditMode(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'application': return 'bg-blue-500';
      case 'document': return 'bg-green-500';
      case 'budget': return 'bg-yellow-500';
      case 'compliance': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600">Create and manage review workflows for your organization</p>
        </div>
        <Button 
          onClick={() => setCreateMode(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(createMode || editMode) && (
        <Card>
          <CardHeader>
            <CardTitle>{createMode ? 'Create New Workflow' : 'Edit Workflow'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Workflow Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'application' | 'document' | 'budget' | 'compliance'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="application">Application</option>
                  <option value="document">Document</option>
                  <option value="budget">Budget</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe this workflow..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Required Approvers</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.requiredApprovers}
                  onChange={(e) => setFormData({...formData, requiredApprovers: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sequential"
                  checked={formData.sequentialApproval}
                  onChange={(e) => setFormData({...formData, sequentialApproval: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="sequential" className="text-sm font-medium">Sequential Approval</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="active" className="text-sm font-medium">Active</label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={createMode ? handleCreateWorkflow : handleUpdateWorkflow}
                disabled={!formData.name.trim()}
              >
                {createMode ? 'Create Workflow' : 'Update Workflow'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreateMode(false);
                  setEditMode(false);
                  setSelectedWorkflow(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => {
          const metrics = workflowMetrics[workflow.id];
          return (
            <Card key={workflow.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getTypeColor(workflow.type)} text-white`}>
                        {workflow.type}
                      </Badge>
                      {workflow.isActive ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(workflow)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {workflow.description && (
                  <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
                )}
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Required Approvers:
                    </span>
                    <span className="font-medium">{workflow.requiredApprovers}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Settings className="w-4 h-4" />
                      Sequential:
                    </span>
                    <span className="font-medium">
                      {workflow.sequentialApproval ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {metrics && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center gap-1 mb-2 text-sm font-medium">
                        <BarChart3 className="w-4 h-4" />
                        Metrics
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-bold text-blue-600">{metrics.totalRequests}</div>
                          <div className="text-gray-600">Total</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="font-bold text-yellow-600">{metrics.pendingRequests}</div>
                          <div className="text-gray-600">Pending</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-600">{metrics.approvedRequests}</div>
                          <div className="text-gray-600">Approved</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-600">{metrics.rejectedRequests}</div>
                          <div className="text-gray-600">Rejected</div>
                        </div>
                      </div>
                      {metrics.averageProcessingTime > 0 && (
                        <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Avg. processing: {Math.round(metrics.averageProcessingTime / 24)} days
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {workflows.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">Create your first review workflow to get started</p>
            <Button onClick={() => setCreateMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}