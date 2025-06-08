'use client';

import { useState } from 'react';
import AIEditorV2 from '@/components/ai/AIEditorV2';
import { User as AuthUser, UserRole } from '@/lib/auth';

export default function AIEditorFullPageTest() {
  const [user] = useState<AuthUser | null>({
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.GRANT_WRITER,
    organizationId: 'test-org',
    verified: true
  });

  const handleSave = (content: string) => {
    console.log('Content saved:', content);
  };

  const handleContentChange = (content: string) => {
    console.log('Content changed:', content);
  };

  return (
    <AIEditorV2
      applicationId="test-app-1"
      grantId="test-grant-1"
      sectionType="executive_summary"
      sectionTitle="Executive Summary - Science Foundation Ireland Research Grant"
      initialContent=""
      onSave={handleSave}
      onContentChange={handleContentChange}
      fullPage={true}
    />
  );
}