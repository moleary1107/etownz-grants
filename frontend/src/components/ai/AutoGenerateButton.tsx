'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Wand2, 
  RefreshCw, 
  CheckCircle 
} from 'lucide-react';
import { aiEditorService } from '@/lib/api/aiEditorServiceV2';

interface AutoGenerateButtonProps {
  sectionType: string;
  grantId: string;
  organizationId: string;
  onContentGenerated: (content: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export default function AutoGenerateButton({
  sectionType,
  grantId,
  organizationId,
  onContentGenerated,
  variant = 'default',
  size = 'default',
  className = ''
}: AutoGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      // First, fetch real grant data from the backend
      const grantResponse = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api' : 'http://localhost:8001'}/grants/${grantId}`);
      const grantData = grantResponse.ok ? await grantResponse.json() : null;

      // Fetch organization data from the backend
      const orgResponse = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://grants.etownz.com/api' : 'http://localhost:8001'}/organizations/${organizationId}`);
      const organizationData = orgResponse.ok ? await orgResponse.json() : null;

      // Use the real AI service to generate content
      const result = await aiEditorService.autoGenerateSection({
        grantId,
        organizationId,
        sectionType,
        grantInfo: grantData || {
          id: grantId,
          title: "Grant Application",
          funder: "Funding Organization",
          focus_areas: ["Research", "Innovation"]
        },
        organizationProfile: organizationData || {
          id: organizationId,
          name: "Your Organization",
          type: "Organization",
          location: "Location",
          expertise: ["Domain Expertise"]
        }
      });

      onContentGenerated(result.content);
      setHasGenerated(true);
    } catch (error) {
      console.error('Failed to generate content:', error);
      // Fall back to mock data if real data fails
      const result = await aiEditorService.autoGenerateSection({
        grantId,
        organizationId,
        sectionType,
        grantInfo: {
          id: grantId,
          title: "Grant Application",
          funder: "Funding Organization"
        },
        organizationProfile: {
          id: organizationId,
          name: "Your Organization"
        }
      });
      onContentGenerated(result.content);
      setHasGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      variant={variant}
      size={size}
      className={className}
    >
      {isGenerating ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : hasGenerated ? (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Regenerate
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4 mr-2" />
          Auto-Generate
        </>
      )}
    </Button>
  );
}