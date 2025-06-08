'use client';

import { useState } from 'react';
import AIEditorAdmin from '@/components/ai/AIEditorAdmin';
import { User as AuthUser, UserRole } from '@/lib/auth';

export default function AIEditorAdminTest() {
  const [user] = useState<AuthUser | null>({
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.GRANT_WRITER,
    organizationId: 'test-org',
    verified: true
  });

  const handleBack = () => {
    // In production, this would navigate back to applications list
    console.log('Back to applications');
  };

  return (
    <AIEditorAdmin
      grantId="sfi-ai-2025"
      applicationId="app-tcd-climate-ai"
      sectionType="executive_summary"
      sectionTitle="Executive Summary"
      initialContent="Our research aims to develop cutting-edge AI models for climate prediction specifically tailored to Irish agricultural conditions..."
      onBack={handleBack}
    />
  );
}