'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the component to avoid SSR issues
const WorkflowAutomationPage = dynamic(
  () => import('@/components/dashboard/WorkflowAutomationPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow automation...</p>
        </div>
      </div>
    )
  }
);

export default function WorkflowAutomationPageWrapper() {
  return <WorkflowAutomationPage />;
}