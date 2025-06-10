'use client';

import React from 'react';
import { Metadata } from 'next';
import ReviewApprovalDashboard from '../../../components/review/ReviewApprovalDashboard';

export default function ReviewApprovalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewApprovalDashboard />
    </div>
  );
}

// Note: This would normally be exported as a const, but since we're using 'use client'
// directive for this page, we can't export metadata from client components.
// The metadata would need to be handled by a parent server component if needed.