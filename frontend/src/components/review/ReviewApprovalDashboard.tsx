'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { toast } from '../../lib/hooks/use-toast';

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

interface ReviewRequest {
  id: number;
  workflowId: number;
  entityType: string;
  entityId: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  currentStageId?: number;
  submittedBy: number;
  submittedAt: string;
  completedAt?: string;
  autoApproved: boolean;
  finalDecision?: 'approved' | 'rejected';
  workflowName?: string;
  workflowType?: string;
  currentStageName?: string;
  submittedByEmail?: string;
}

interface PendingApproval {
  id: number;
  requestId: number;
  stageId: number;
  approverId: number;
  status: 'pending' | 'approved' | 'rejected';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: string;
  workflowName: string;
  stageName: string;
  submittedByEmail?: string;
}

interface ReviewComment {
  id: number;
  requestId: number;
  userId: number;
  commentType: 'comment' | 'question' | 'clarification' | 'system';
  content: string;
  isInternal: boolean;
  createdAt: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

interface DashboardData {
  pendingApprovals: PendingApproval[];
  recentRequests: ReviewRequest[];
  workflows: ReviewWorkflow[];
  summary: {
    pendingCount: number;
    recentCount: number;
    workflowCount: number;
  };
}

export default function ReviewApprovalDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [requestComments, setRequestComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/review-approval/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestComments = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/requests/${requestId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setRequestComments(data.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      });
    }
  };

  const processApproval = async (approvalId: number, decision: 'approve' | 'reject' | 'request_changes', comments?: string) => {
    setProcessingApproval(approvalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/approvals/${approvalId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision, comments })
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      toast({
        title: 'Success',
        description: `Approval ${decision}d successfully`,
        variant: 'default'
      });

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to process approval',
        variant: 'destructive'
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  const addComment = async (requestId: number) => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/review-approval/requests/${requestId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          commentType: 'comment'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchRequestComments(requestId);
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'in_review': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load review dashboard data.</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review & Approval Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage approval workflows and pending requests</p>
        </div>
        <Button 
          onClick={fetchDashboardData}
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-orange-600">{dashboardData.summary.pendingCount}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Requests</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardData.summary.recentCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-green-600">{dashboardData.summary.workflowCount}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="requests">Recent Requests</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          {dashboardData.pendingApprovals.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-500">No pending approvals require your attention.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboardData.pendingApprovals.map((approval) => (
                <Card key={approval.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{approval.title}</h3>
                        <Badge className={`${getPriorityColor(approval.priority)} text-white`}>
                          {approval.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {approval.workflowName}
                        </Badge>
                      </div>
                      
                      {approval.description && (
                        <p className="text-gray-600 mb-3">{approval.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Stage: {approval.stageName}</span>
                        <span>•</span>
                        <span>Submitted: {formatDate(approval.submittedAt)}</span>
                        {approval.submittedByEmail && (
                          <>
                            <span>•</span>
                            <span>By: {approval.submittedByEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => processApproval(approval.id, 'approve')}
                        disabled={processingApproval === approval.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingApproval === approval.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => processApproval(approval.id, 'reject')}
                        disabled={processingApproval === approval.id}
                        size="sm"
                        variant="destructive"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => processApproval(approval.id, 'request_changes')}
                        disabled={processingApproval === approval.id}
                        size="sm"
                        variant="outline"
                      >
                        Request Changes
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recent Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {dashboardData.recentRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">No Recent Requests</h3>
              <p className="text-gray-500">No review requests have been submitted recently.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboardData.recentRequests.map((request) => (
                <Card key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <Badge className={`${getPriorityColor(request.priority)} text-white`}>
                          {request.priority.toUpperCase()}
                        </Badge>
                        <Badge className={`${getStatusColor(request.status)} text-white`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      {request.description && (
                        <p className="text-gray-600 mb-3">{request.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Type: {request.entityType}</span>
                        <span>•</span>
                        <span>Workflow: {request.workflowName}</span>
                        <span>•</span>
                        <span>Submitted: {formatDate(request.submittedAt)}</span>
                        {request.currentStageName && (
                          <>
                            <span>•</span>
                            <span>Current Stage: {request.currentStageName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          fetchRequestComments(request.id);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          {dashboardData.workflows.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">No Workflows</h3>
              <p className="text-gray-500">No review workflows are currently configured.</p>
              <Button className="mt-4">
                Create Workflow
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardData.workflows.map((workflow) => (
                <Card key={workflow.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {workflow.type.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge className={workflow.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                      {workflow.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                  
                  {workflow.description && (
                    <p className="text-gray-600 mb-4">{workflow.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Required Approvers:</span>
                      <span>{workflow.requiredApprovers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sequential Approval:</span>
                      <span>{workflow.sequentialApproval ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDate(workflow.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      View Stages
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedRequest.title}</h2>
                <Button
                  onClick={() => setSelectedRequest(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Request Details */}
              <div>
                <h3 className="text-lg font-medium mb-3">Request Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge className={`ml-2 ${getStatusColor(selectedRequest.status)} text-white`}>
                      {selectedRequest.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span>
                    <Badge className={`ml-2 ${getPriorityColor(selectedRequest.priority)} text-white`}>
                      {selectedRequest.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{selectedRequest.entityType}</span>
                  </div>
                  <div>
                    <span className="font-medium">Workflow:</span>
                    <span className="ml-2">{selectedRequest.workflowName}</span>
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <span className="ml-2">{formatDate(selectedRequest.submittedAt)}</span>
                  </div>
                  {selectedRequest.completedAt && (
                    <div>
                      <span className="font-medium">Completed:</span>
                      <span className="ml-2">{formatDate(selectedRequest.completedAt)}</span>
                    </div>
                  )}
                </div>
                
                {selectedRequest.description && (
                  <div className="mt-4">
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-gray-600">{selectedRequest.description}</p>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-lg font-medium mb-3">Comments</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {requestComments.map((comment) => (
                    <div key={comment.id} className="border-l-4 border-blue-200 pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {comment.firstName && comment.lastName 
                            ? `${comment.firstName} ${comment.lastName}`
                            : comment.userEmail
                          }
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                      {comment.isInternal && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Internal
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Add Comment */}
                <div className="mt-4 space-y-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <Button
                    onClick={() => addComment(selectedRequest.id)}
                    disabled={!newComment.trim()}
                    size="sm"
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}