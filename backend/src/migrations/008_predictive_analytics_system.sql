-- Predictive Analytics System Migration
-- Phase 3.1: AI-Powered Predictive Analytics
-- Created: 2025-06-02

-- Grant Success Predictions Table
CREATE TABLE IF NOT EXISTS grant_success_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    success_probability INTEGER NOT NULL CHECK (success_probability >= 0 AND success_probability <= 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    
    -- Prediction factors (stored as JSONB for flexibility)
    predicted_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- AI-generated recommendations
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Historical comparison data
    historical_comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Competitive analysis results
    competitive_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Optimal timing recommendations
    optimal_timing JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadata
    model_version VARCHAR(50) DEFAULT '1.0.0',
    ai_model_used VARCHAR(100) DEFAULT 'gpt-4o-mini',
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Validation tracking (for ML model improvement)
    actual_outcome VARCHAR(50), -- 'approved', 'rejected', 'withdrawn', 'pending'
    outcome_date TIMESTAMP,
    prediction_accuracy DECIMAL(5,4), -- Calculated after outcome is known
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '6 months')
);

-- Budget Optimization Table
CREATE TABLE IF NOT EXISTS budget_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Budget analysis results
    analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Benchmarking data
    benchmarking JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Strategic recommendations
    recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Validation tracking
    actual_requested_amount DECIMAL(15,2),
    actual_awarded_amount DECIMAL(15,2),
    budget_effectiveness_score DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competition Analysis Table
CREATE TABLE IF NOT EXISTS competition_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    analysis_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Competition metrics
    competition_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Market insights
    market_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Strategic recommendations
    strategic_recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Confidence metrics
    confidence_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Validation data
    actual_applicant_count INTEGER,
    actual_competition_level VARCHAR(20),
    analysis_accuracy_score DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictive Insights Table
CREATE TABLE IF NOT EXISTS predictive_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Generated insights
    insights JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Performance summary
    performance_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- User interaction tracking
    insights_viewed INTEGER DEFAULT 0,
    insights_acted_upon INTEGER DEFAULT 0,
    user_feedback_score DECIMAL(3,2), -- 1-10 user rating
    
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ML Model Performance Tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type VARCHAR(100) NOT NULL, -- 'success_prediction', 'budget_optimization', 'competition_analysis'
    model_version VARCHAR(50) NOT NULL,
    
    -- Performance metrics
    accuracy_rate DECIMAL(5,4) NOT NULL,
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    -- Training data info
    training_data_size INTEGER,
    training_date TIMESTAMP,
    
    -- Evaluation period
    evaluation_start_date TIMESTAMP NOT NULL,
    evaluation_end_date TIMESTAMP NOT NULL,
    predictions_evaluated INTEGER NOT NULL,
    
    -- Model parameters
    model_parameters JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Prediction Preferences
CREATE TABLE IF NOT EXISTS user_prediction_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Prediction settings
    enable_success_predictions BOOLEAN DEFAULT true,
    enable_budget_optimization BOOLEAN DEFAULT true,
    enable_competition_analysis BOOLEAN DEFAULT true,
    enable_predictive_insights BOOLEAN DEFAULT true,
    
    -- Notification preferences
    prediction_notifications JSONB DEFAULT '{
        "email": true,
        "in_app": true,
        "frequency": "weekly"
    }'::jsonb,
    
    -- Customization settings
    focus_areas JSONB DEFAULT '[]'::jsonb,
    risk_tolerance VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    prediction_horizon_days INTEGER DEFAULT 90,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Prediction Analytics Events (for ML feedback loop)
CREATE TABLE IF NOT EXISTS prediction_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prediction_id UUID, -- References one of the prediction tables
    prediction_type VARCHAR(50) NOT NULL, -- 'success', 'budget', 'competition', 'insights'
    
    -- User interaction data
    event_type VARCHAR(50) NOT NULL, -- 'viewed', 'acted_upon', 'dismissed', 'rated'
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Outcome tracking
    predicted_result JSONB,
    actual_result JSONB,
    recommendation_followed BOOLEAN,
    outcome VARCHAR(50), -- 'positive', 'negative', 'neutral'
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 10),
    user_comments TEXT,
    user_engagement_score DECIMAL(3,2), -- Calculated engagement metric
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prediction Accuracy Aggregate View
CREATE OR REPLACE VIEW prediction_accuracy_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    'success_prediction' as prediction_type,
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE actual_outcome IS NOT NULL) as validated_predictions,
    AVG(prediction_accuracy) FILTER (WHERE prediction_accuracy IS NOT NULL) as avg_accuracy,
    AVG(confidence_score) as avg_confidence,
    COUNT(*) FILTER (WHERE prediction_accuracy > 0.8) as high_accuracy_predictions
FROM grant_success_predictions
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)

UNION ALL

SELECT 
    DATE_TRUNC('month', created_at) as month,
    'budget_optimization' as prediction_type,
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE actual_awarded_amount IS NOT NULL) as validated_predictions,
    AVG(budget_effectiveness_score) FILTER (WHERE budget_effectiveness_score IS NOT NULL) as avg_accuracy,
    80.0 as avg_confidence, -- Budget optimizations don't have confidence scores
    COUNT(*) FILTER (WHERE budget_effectiveness_score > 0.8) as high_accuracy_predictions
FROM budget_optimizations
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)

ORDER BY month DESC, prediction_type;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_grant_success_predictions_grant_id ON grant_success_predictions(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_success_predictions_org_id ON grant_success_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_success_predictions_created_at ON grant_success_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_grant_success_predictions_success_prob ON grant_success_predictions(success_probability);

CREATE INDEX IF NOT EXISTS idx_budget_optimizations_grant_id ON budget_optimizations(grant_id);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_org_id ON budget_optimizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_created_at ON budget_optimizations(created_at);

CREATE INDEX IF NOT EXISTS idx_competition_analyses_grant_id ON competition_analyses(grant_id);
CREATE INDEX IF NOT EXISTS idx_competition_analyses_analysis_date ON competition_analyses(analysis_date);

CREATE INDEX IF NOT EXISTS idx_predictive_insights_user_id ON predictive_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_generated_at ON predictive_insights(generated_at);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_expires_at ON predictive_insights(expires_at);

CREATE INDEX IF NOT EXISTS idx_prediction_analytics_user_id ON prediction_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_analytics_prediction_type ON prediction_analytics(prediction_type);
CREATE INDEX IF NOT EXISTS idx_prediction_analytics_event_type ON prediction_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_prediction_analytics_created_at ON prediction_analytics(created_at);

-- JSONB Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_grant_success_predictions_factors ON grant_success_predictions USING GIN (predicted_factors);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_analysis ON budget_optimizations USING GIN (analysis);
CREATE INDEX IF NOT EXISTS idx_competition_analyses_metrics ON competition_analyses USING GIN (competition_metrics);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_insights ON predictive_insights USING GIN (insights);

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grant_success_predictions_updated_at 
    BEFORE UPDATE ON grant_success_predictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_optimizations_updated_at 
    BEFORE UPDATE ON budget_optimizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_analyses_updated_at 
    BEFORE UPDATE ON competition_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_prediction_preferences_updated_at 
    BEFORE UPDATE ON user_prediction_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automated Cleanup for Expired Insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $$
BEGIN
    DELETE FROM predictive_insights 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    DELETE FROM grant_success_predictions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Log cleanup activity
    INSERT INTO system_events (event_type, event_data, created_at)
    VALUES ('predictive_insights_cleanup', 
            json_build_object('cleaned_at', CURRENT_TIMESTAMP), 
            CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-insights', '0 2 * * *', 'SELECT cleanup_expired_insights();');

-- Function to Calculate Prediction Accuracy
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
    prediction_id UUID,
    actual_outcome VARCHAR(50)
)
RETURNS void AS $$
DECLARE
    prediction_record RECORD;
    accuracy_score DECIMAL(5,4);
BEGIN
    -- Get the prediction record
    SELECT * INTO prediction_record 
    FROM grant_success_predictions 
    WHERE id = prediction_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate accuracy based on outcome
    CASE actual_outcome
        WHEN 'approved' THEN
            -- Higher predicted probability should correlate with approval
            accuracy_score = prediction_record.success_probability / 100.0;
        WHEN 'rejected' THEN
            -- Lower predicted probability should correlate with rejection
            accuracy_score = (100 - prediction_record.success_probability) / 100.0;
        ELSE
            -- Neutral or unknown outcomes
            accuracy_score = 0.5;
    END CASE;
    
    -- Update the prediction record
    UPDATE grant_success_predictions 
    SET 
        actual_outcome = actual_outcome,
        outcome_date = CURRENT_TIMESTAMP,
        prediction_accuracy = accuracy_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = prediction_id;
    
    -- Log the accuracy calculation
    INSERT INTO prediction_analytics (
        user_id, prediction_id, prediction_type, event_type, 
        predicted_result, actual_result, created_at
    )
    VALUES (
        (SELECT organization_id FROM grant_success_predictions WHERE id = prediction_id),
        prediction_id,
        'success',
        'accuracy_calculated',
        json_build_object('success_probability', prediction_record.success_probability),
        json_build_object('outcome', actual_outcome, 'accuracy', accuracy_score),
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO user_prediction_preferences (user_id, focus_areas, risk_tolerance)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '["technology", "innovation"]'::jsonb, 'medium'),
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', '["healthcare", "research"]'::jsonb, 'low'),
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', '["environment", "sustainability"]'::jsonb, 'high')
ON CONFLICT (user_id) DO NOTHING;

-- Create system events table if it doesn't exist (for logging)
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE grant_success_predictions IS 'AI-powered predictions for grant application success probability';
COMMENT ON TABLE budget_optimizations IS 'AI-driven budget optimization recommendations';
COMMENT ON TABLE competition_analyses IS 'Competitive landscape analysis for grants';
COMMENT ON TABLE predictive_insights IS 'Personalized predictive insights and recommendations';
COMMENT ON TABLE ml_model_performance IS 'Machine learning model performance tracking';
COMMENT ON TABLE user_prediction_preferences IS 'User preferences for predictive analytics';
COMMENT ON TABLE prediction_analytics IS 'Analytics events for prediction feedback and ML improvement';

-- Grant permissions for application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;