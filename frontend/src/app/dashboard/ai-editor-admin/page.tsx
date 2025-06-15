'use client';

import AIEditorAdmin from '@/components/ai/AIEditorAdmin';

export default function AIEditorAdminTest() {

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