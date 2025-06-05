'use client';

import React from 'react';
import { AIMonitoringDashboard } from '@/components/ai/AIMonitoringDashboard';

export default function AIMonitoringPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI System Monitoring</h1>
            <p className="text-muted-foreground">
              Real-time performance metrics and cost analytics for AI services
            </p>
          </div>
        </div>
        
        <AIMonitoringDashboard />
      </div>
    </div>
  );
}