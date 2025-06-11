import { Pool } from 'pg';
import { logger } from './logger';

interface ReviewWorkflow {
  id?: number;
  name: string;
  description?: string;
  type: 'application' | 'document' | 'budget' | 'compliance';
  organizationId?: number;
  isActive?: boolean;
  requiredApprovers?: number;
  sequentialApproval?: boolean;
  autoApprovalRules?: any;
  escalationRules?: any;
  notificationSettings?: any;
  createdBy?: number;
}

interface ReviewStage {
  id?: number;
  workflowId: number;
  stageOrder: number;
  stageName: string;
  stageDescription?: string;
  requiredApprovers?: number;
  approverRoles?: string[];
  approverUsers?: number[];
  conditions?: any;
  actions?: any;
  timeoutHours?: number;
  isFinal?: boolean;
}

interface ReviewRequest {
  id?: number;
  workflowId: number;
  entityType: string;
  entityId: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  currentStageId?: number;
  metadata?: any;
  submittedBy: number;
  submittedAt?: Date;
  completedAt?: Date;
  autoApproved?: boolean;
  rejectionReason?: string;
  finalDecision?: 'approved' | 'rejected';
  decisionMetadata?: any;
}

interface ReviewApproval {
  id?: number;
  requestId: number;
  stageId: number;
  approverId: number;
  status?: 'pending' | 'approved' | 'rejected' | 'delegated';
  decision?: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  attachments?: any[];
  conditionsMet?: any;
  delegatedTo?: number;
  approvedAt?: Date;
}

interface ReviewComment {
  id?: number;
  requestId: number;
  userId: number;
  commentType?: 'comment' | 'question' | 'clarification' | 'system';
  content: string;
  attachments?: any[];
  mentions?: number[];
  isInternal?: boolean;
  parentId?: number;
}

interface ReviewMetrics {
  workflowId: number;
  periodStart: Date;
  periodEnd: Date;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  avgApprovalTimeHours: number;
  bottleneckStages: any[];
  efficiencyScore: number;
  userPerformance: any;
}

export class ReviewApprovalService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  // Workflow Management
  async createWorkflow(workflow: ReviewWorkflow): Promise<ReviewWorkflow> {
    try {
      const query = `
        INSERT INTO review_workflows (
          name, description, type, organization_id, is_active,
          required_approvers, sequential_approval, auto_approval_rules,
          escalation_rules, notification_settings, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        workflow.name,
        workflow.description,
        workflow.type,
        workflow.organizationId,
        workflow.isActive ?? true,
        workflow.requiredApprovers ?? 1,
        workflow.sequentialApproval ?? false,
        JSON.stringify(workflow.autoApprovalRules || {}),
        JSON.stringify(workflow.escalationRules || {}),
        JSON.stringify(workflow.notificationSettings || {}),
        workflow.createdBy
      ];

      const result = await this.db.query(query, values);
      logger.info('Review workflow created', { workflowId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating review workflow', { error, workflow });
      throw error;
    }
  }

  async getWorkflows(organizationId?: number): Promise<ReviewWorkflow[]> {
    try {
      let query = 'SELECT * FROM review_workflows WHERE is_active = true';
      const values: any[] = [];

      if (organizationId) {
        query += ' AND (organization_id = $1 OR organization_id IS NULL)';
        values.push(organizationId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching workflows', { error, organizationId });
      throw error;
    }
  }

  async getWorkflowById(id: number): Promise<ReviewWorkflow | null> {
    try {
      const query = 'SELECT * FROM review_workflows WHERE id = $1';
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching workflow by ID', { error, id });
      throw error;
    }
  }

  // Stage Management
  async createStage(stage: ReviewStage): Promise<ReviewStage> {
    try {
      const query = `
        INSERT INTO review_stages (
          workflow_id, stage_order, stage_name, stage_description,
          required_approvers, approver_roles, approver_users,
          conditions, actions, timeout_hours, is_final
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        stage.workflowId,
        stage.stageOrder,
        stage.stageName,
        stage.stageDescription,
        stage.requiredApprovers ?? 1,
        stage.approverRoles || [],
        stage.approverUsers || [],
        JSON.stringify(stage.conditions || {}),
        JSON.stringify(stage.actions || {}),
        stage.timeoutHours,
        stage.isFinal ?? false
      ];

      const result = await this.db.query(query, values);
      logger.info('Review stage created', { stageId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating review stage', { error, stage });
      throw error;
    }
  }

  async getWorkflowStages(workflowId: number): Promise<ReviewStage[]> {
    try {
      const query = `
        SELECT * FROM review_stages 
        WHERE workflow_id = $1 
        ORDER BY stage_order ASC
      `;
      const result = await this.db.query(query, [workflowId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching workflow stages', { error, workflowId });
      throw error;
    }
  }

  // Review Request Management
  async createReviewRequest(request: ReviewRequest): Promise<ReviewRequest> {
    try {
      // Check for auto-approval conditions
      const workflow = await this.getWorkflowById(request.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const autoApproved = await this.checkAutoApproval(request, workflow);
      const stages = await this.getWorkflowStages(request.workflowId);
      const firstStage = stages[0];

      const query = `
        INSERT INTO review_requests (
          workflow_id, entity_type, entity_id, title, description,
          priority, status, current_stage_id, metadata, submitted_by,
          auto_approved, final_decision
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        request.workflowId,
        request.entityType,
        request.entityId,
        request.title,
        request.description,
        request.priority || 'medium',
        autoApproved ? 'approved' : 'pending',
        autoApproved ? null : firstStage?.id,
        JSON.stringify(request.metadata || {}),
        request.submittedBy,
        autoApproved,
        autoApproved ? 'approved' : null
      ];

      const result = await this.db.query(query, values);
      const reviewRequest = result.rows[0];

      // Log the creation
      await this.logHistory(reviewRequest.id, request.submittedBy, 'created', 'Review request created');

      // Create initial approvals if not auto-approved
      if (!autoApproved && firstStage) {
        await this.createStageApprovals(reviewRequest.id, firstStage);
      }

      logger.info('Review request created', { 
        requestId: reviewRequest.id, 
        autoApproved 
      });

      return reviewRequest;
    } catch (error) {
      logger.error('Error creating review request', { error, request });
      throw error;
    }
  }

  async getReviewRequests(filters: {
    organizationId?: number;
    submittedBy?: number;
    approverId?: number;
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ requests: ReviewRequest[]; total: number }> {
    try {
      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramCount = 0;

      if (filters.organizationId) {
        paramCount++;
        whereConditions.push(`rw.organization_id = $${paramCount}`);
        values.push(filters.organizationId);
      }

      if (filters.submittedBy) {
        paramCount++;
        whereConditions.push(`rr.submitted_by = $${paramCount}`);
        values.push(filters.submittedBy);
      }

      if (filters.approverId) {
        paramCount++;
        whereConditions.push(`EXISTS (
          SELECT 1 FROM review_approvals ra 
          WHERE ra.request_id = rr.id AND ra.approver_id = $${paramCount}
        )`);
        values.push(filters.approverId);
      }

      if (filters.status) {
        paramCount++;
        whereConditions.push(`rr.status = $${paramCount}`);
        values.push(filters.status);
      }

      if (filters.entityType) {
        paramCount++;
        whereConditions.push(`rr.entity_type = $${paramCount}`);
        values.push(filters.entityType);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM review_requests rr
        JOIN review_workflows rw ON rr.workflow_id = rw.id
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get requests with pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const query = `
        SELECT rr.*, rw.name as workflow_name, rw.type as workflow_type,
               rs.stage_name as current_stage_name,
               u.email as submitted_by_email
        FROM review_requests rr
        JOIN review_workflows rw ON rr.workflow_id = rw.id
        LEFT JOIN review_stages rs ON rr.current_stage_id = rs.id
        LEFT JOIN users u ON rr.submitted_by = u.id
        ${whereClause}
        ORDER BY rr.submitted_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      values.push(limit, offset);
      const result = await this.db.query(query, values);

      return {
        requests: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error fetching review requests', { error, filters });
      throw error;
    }
  }

  async getReviewRequestById(id: number): Promise<ReviewRequest | null> {
    try {
      const query = `
        SELECT rr.*, rw.name as workflow_name, rw.type as workflow_type,
               rs.stage_name as current_stage_name,
               u.email as submitted_by_email
        FROM review_requests rr
        JOIN review_workflows rw ON rr.workflow_id = rw.id
        LEFT JOIN review_stages rs ON rr.current_stage_id = rs.id
        LEFT JOIN users u ON rr.submitted_by = u.id
        WHERE rr.id = $1
      `;
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching review request by ID', { error, id });
      throw error;
    }
  }

  // Approval Management
  async processApproval(approvalId: number, decision: 'approve' | 'reject' | 'request_changes', approverId: number, comments?: string): Promise<void> {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Update the approval
        const updateQuery = `
          UPDATE review_approvals 
          SET status = $1, decision = $2, comments = $3, approved_at = NOW()
          WHERE id = $4 AND approver_id = $5
          RETURNING *
        `;
        const updateResult = await client.query(updateQuery, [
          decision === 'approve' ? 'approved' : 'rejected',
          decision,
          comments,
          approvalId,
          approverId
        ]);

        if (updateResult.rows.length === 0) {
          throw new Error('Approval not found or unauthorized');
        }

        const approval = updateResult.rows[0];
        const requestId = approval.request_id;

        // Log the action
        await this.logHistory(requestId, approverId, `approval_${decision}`, 
          `Approval ${decision}: ${comments || 'No comments'}`);

        // Check if stage is complete
        await this.checkStageCompletion(requestId, approval.stage_id);

        await client.query('COMMIT');
        logger.info('Approval processed', { approvalId, decision, approverId });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error processing approval', { error, approvalId, decision });
      throw error;
    }
  }

  async getUserPendingApprovals(userId: number): Promise<any[]> {
    try {
      const query = `
        SELECT ra.*, rr.title, rr.description, rr.priority, rr.submitted_at,
               rw.name as workflow_name, rs.stage_name,
               u.email as submitted_by_email
        FROM review_approvals ra
        JOIN review_requests rr ON ra.request_id = rr.id
        JOIN review_workflows rw ON rr.workflow_id = rw.id
        JOIN review_stages rs ON ra.stage_id = rs.id
        LEFT JOIN users u ON rr.submitted_by = u.id
        WHERE ra.approver_id = $1 AND ra.status = 'pending'
        ORDER BY rr.priority DESC, rr.submitted_at ASC
      `;
      const result = await this.db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending approvals', { error, userId });
      throw error;
    }
  }

  // Comments
  async addComment(comment: ReviewComment): Promise<ReviewComment> {
    try {
      const query = `
        INSERT INTO review_comments (
          request_id, user_id, comment_type, content, attachments,
          mentions, is_internal, parent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        comment.requestId,
        comment.userId,
        comment.commentType || 'comment',
        comment.content,
        JSON.stringify(comment.attachments || []),
        comment.mentions || [],
        comment.isInternal ?? false,
        comment.parentId
      ];

      const result = await this.db.query(query, values);
      
      // Log the comment
      await this.logHistory(comment.requestId, comment.userId, 'comment_added', 
        `Comment added: ${comment.content.substring(0, 100)}...`);

      logger.info('Review comment added', { commentId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding review comment', { error, comment });
      throw error;
    }
  }

  async getRequestComments(requestId: number): Promise<ReviewComment[]> {
    try {
      const query = `
        SELECT rc.*, u.email as user_email, u.first_name, u.last_name
        FROM review_comments rc
        JOIN users u ON rc.user_id = u.id
        WHERE rc.request_id = $1
        ORDER BY rc.created_at ASC
      `;
      const result = await this.db.query(query, [requestId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching request comments', { error, requestId });
      throw error;
    }
  }

  // Analytics and Metrics
  async generateWorkflowMetrics(workflowId: number, startDate: Date, endDate: Date): Promise<ReviewMetrics> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN final_decision = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN final_decision = 'rejected' THEN 1 END) as rejected_requests,
          AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/3600) as avg_approval_time_hours
        FROM review_requests
        WHERE workflow_id = $1 
          AND submitted_at >= $2 
          AND submitted_at <= $3
          AND completed_at IS NOT NULL
      `;

      const result = await this.db.query(query, [workflowId, startDate, endDate]);
      const stats = result.rows[0];

      const metrics: ReviewMetrics = {
        workflowId,
        periodStart: startDate,
        periodEnd: endDate,
        totalRequests: parseInt(stats.total_requests) || 0,
        approvedRequests: parseInt(stats.approved_requests) || 0,
        rejectedRequests: parseInt(stats.rejected_requests) || 0,
        avgApprovalTimeHours: parseFloat(stats.avg_approval_time_hours) || 0,
        bottleneckStages: [],
        efficiencyScore: 0,
        userPerformance: {}
      };

      // Calculate efficiency score
      if (metrics.totalRequests > 0) {
        metrics.efficiencyScore = (metrics.approvedRequests / metrics.totalRequests) * 100;
      }

      // Store metrics
      await this.storeMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('Error generating workflow metrics', { error, workflowId });
      throw error;
    }
  }

  // Private helper methods
  private async checkAutoApproval(request: ReviewRequest, workflow: ReviewWorkflow): Promise<boolean> {
    try {
      if (!workflow.autoApprovalRules) return false;

      const rules = workflow.autoApprovalRules;
      
      // Example auto-approval logic - customize based on needs
      if (rules.max_amount && request.metadata?.amount > rules.max_amount) {
        return false;
      }

      if (rules.trusted_applicants && request.metadata?.trusted_user) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking auto approval', { error, request });
      return false;
    }
  }

  private async createStageApprovals(requestId: number, stage: ReviewStage): Promise<void> {
    try {
      // Get potential approvers based on roles and specific users
      let approvers: number[] = [];

      if (stage.approverUsers && stage.approverUsers.length > 0) {
        approvers = stage.approverUsers;
      } else if (stage.approverRoles && stage.approverRoles.length > 0) {
        // Get users with specified roles
        const roleQuery = `
          SELECT DISTINCT u.id 
          FROM users u 
          WHERE u.role = ANY($1)
        `;
        const roleResult = await this.db.query(roleQuery, [stage.approverRoles]);
        approvers = roleResult.rows.map(row => row.id);
      }

      // Create approval records
      for (const approverId of approvers) {
        const query = `
          INSERT INTO review_approvals (request_id, stage_id, approver_id, status)
          VALUES ($1, $2, $3, 'pending')
        `;
        await this.db.query(query, [requestId, stage.id, approverId]);
      }

      logger.info('Stage approvals created', { requestId, stageId: stage.id, approverCount: approvers.length });
    } catch (error) {
      logger.error('Error creating stage approvals', { error, requestId, stage });
      throw error;
    }
  }

  private async checkStageCompletion(requestId: number, stageId: number): Promise<void> {
    try {
      // Get stage requirements
      const stageQuery = 'SELECT * FROM review_stages WHERE id = $1';
      const stageResult = await this.db.query(stageQuery, [stageId]);
      const stage = stageResult.rows[0];

      if (!stage) return;

      // Count approvals for this stage
      const approvalQuery = `
        SELECT COUNT(*) as total_approvals,
               COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
               COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
        FROM review_approvals
        WHERE request_id = $1 AND stage_id = $2
      `;
      const approvalResult = await this.db.query(approvalQuery, [requestId, stageId]);
      const approvalStats = approvalResult.rows[0];

      const totalApprovals = parseInt(approvalStats.total_approvals);
      const approvedCount = parseInt(approvalStats.approved_count);
      const rejectedCount = parseInt(approvalStats.rejected_count);

      // Check if stage is complete
      const requiredApprovers = stage.required_approvers || 1;
      
      if (rejectedCount > 0) {
        // Stage rejected
        await this.updateRequestStatus(requestId, 'rejected', 'rejected');
        await this.logHistory(requestId, null, 'stage_rejected', `Stage ${stage.stage_name} rejected`);
      } else if (approvedCount >= requiredApprovers) {
        // Stage approved, move to next stage or complete
        if (stage.is_final) {
          await this.updateRequestStatus(requestId, 'approved', 'approved');
          await this.logHistory(requestId, null, 'request_approved', 'Review request approved');
        } else {
          await this.moveToNextStage(requestId, stage.workflow_id, stage.stage_order);
        }
      }
    } catch (error) {
      logger.error('Error checking stage completion', { error, requestId, stageId });
      throw error;
    }
  }

  private async moveToNextStage(requestId: number, workflowId: number, currentStageOrder: number): Promise<void> {
    try {
      // Get next stage
      const nextStageQuery = `
        SELECT * FROM review_stages 
        WHERE workflow_id = $1 AND stage_order = $2
      `;
      const nextStageResult = await this.db.query(nextStageQuery, [workflowId, currentStageOrder + 1]);
      
      if (nextStageResult.rows.length === 0) {
        // No next stage, mark as completed
        await this.updateRequestStatus(requestId, 'approved', 'approved');
        return;
      }

      const nextStage = nextStageResult.rows[0];

      // Update request current stage
      const updateQuery = `
        UPDATE review_requests 
        SET current_stage_id = $1, status = 'in_review'
        WHERE id = $2
      `;
      await this.db.query(updateQuery, [nextStage.id, requestId]);

      // Create approvals for next stage
      await this.createStageApprovals(requestId, nextStage);

      await this.logHistory(requestId, null, 'stage_advanced', 
        `Advanced to stage: ${nextStage.stage_name}`);

      logger.info('Request moved to next stage', { requestId, nextStageId: nextStage.id });
    } catch (error) {
      logger.error('Error moving to next stage', { error, requestId, workflowId });
      throw error;
    }
  }

  private async updateRequestStatus(requestId: number, status: string, finalDecision?: string): Promise<void> {
    try {
      let query = 'UPDATE review_requests SET status = $1';
      const values: any[] = [status];

      if (finalDecision) {
        query += ', final_decision = $2, completed_at = NOW()';
        values.push(finalDecision);
      }

      query += ' WHERE id = $' + (values.length + 1);
      values.push(requestId);

      await this.db.query(query, values);
      logger.info('Request status updated', { requestId, status, finalDecision });
    } catch (error) {
      logger.error('Error updating request status', { error, requestId, status });
      throw error;
    }
  }

  private async logHistory(requestId: number, userId: number | null, action: string, description: string): Promise<void> {
    try {
      const query = `
        INSERT INTO review_history (request_id, user_id, action, description)
        VALUES ($1, $2, $3, $4)
      `;
      await this.db.query(query, [requestId, userId, action, description]);
    } catch (error) {
      logger.error('Error logging history', { error, requestId, action });
      // Don't throw - history logging shouldn't break main flow
    }
  }

  private async storeMetrics(metrics: ReviewMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO review_metrics (
          workflow_id, period_start, period_end, total_requests,
          approved_requests, rejected_requests, avg_approval_time_hours,
          bottleneck_stages, efficiency_score, user_performance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (workflow_id, period_start, period_end) 
        DO UPDATE SET
          total_requests = EXCLUDED.total_requests,
          approved_requests = EXCLUDED.approved_requests,
          rejected_requests = EXCLUDED.rejected_requests,
          avg_approval_time_hours = EXCLUDED.avg_approval_time_hours,
          efficiency_score = EXCLUDED.efficiency_score,
          calculated_at = NOW()
      `;

      const values = [
        metrics.workflowId,
        metrics.periodStart,
        metrics.periodEnd,
        metrics.totalRequests,
        metrics.approvedRequests,
        metrics.rejectedRequests,
        metrics.avgApprovalTimeHours,
        JSON.stringify(metrics.bottleneckStages),
        metrics.efficiencyScore,
        JSON.stringify(metrics.userPerformance)
      ];

      await this.db.query(query, values);
      logger.info('Metrics stored', { workflowId: metrics.workflowId });
    } catch (error) {
      logger.error('Error storing metrics', { error, metrics });
      throw error;
    }
  }

  async updateWorkflow(workflowId: number, updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
    requiredApprovers?: number;
    sequentialApproval?: boolean;
    updatedBy?: string;
  }): Promise<any> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        setParts.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.isActive !== undefined) {
        setParts.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      if (updates.requiredApprovers !== undefined) {
        setParts.push(`required_approvers = $${paramIndex++}`);
        values.push(updates.requiredApprovers);
      }
      if (updates.sequentialApproval !== undefined) {
        setParts.push(`sequential_approval = $${paramIndex++}`);
        values.push(updates.sequentialApproval);
      }

      setParts.push(`updated_at = NOW()`);
      values.push(workflowId);

      const query = `
        UPDATE review_workflows 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      logger.info('Workflow updated', { workflowId, updates });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating workflow', { error, workflowId, updates });
      throw error;
    }
  }

  async deleteWorkflow(workflowId: number): Promise<void> {
    try {
      // Check if workflow has any active requests
      const activeRequestsQuery = `
        SELECT COUNT(*) as count 
        FROM review_requests 
        WHERE workflow_id = $1 AND status NOT IN ('approved', 'rejected', 'cancelled')
      `;
      const activeRequestsResult = await this.db.query(activeRequestsQuery, [workflowId]);
      
      if (parseInt(activeRequestsResult.rows[0].count) > 0) {
        throw new Error('Cannot delete workflow with active requests. Please complete or cancel all pending requests first.');
      }

      // Delete the workflow (this will cascade to related records)
      const deleteQuery = `
        DELETE FROM review_workflows 
        WHERE id = $1
      `;
      
      const result = await this.db.query(deleteQuery, [workflowId]);
      
      if (result.rowCount === 0) {
        throw new Error('Workflow not found');
      }

      logger.info('Workflow deleted', { workflowId });
    } catch (error) {
      logger.error('Error deleting workflow', { error, workflowId });
      throw error;
    }
  }
}

export default ReviewApprovalService;