'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the component to avoid SSR issues
const GrantsDashboard = dynamic(
  () => import('@/components/dashboard/GrantsDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

export default function GrantsPage() {
  return <GrantsDashboard />;
}