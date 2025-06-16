'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the component to avoid SSR issues
const AIMonitoringDashboard = dynamic(
  () => import('@/components/ai/AIMonitoringDashboard').then(mod => ({ default: mod.AIMonitoringDashboard })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

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