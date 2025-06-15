'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/card';
import AIEditor from '@/components/ai/AIEditor';
import { User as AuthUser, UserRole } from '@/lib/auth';

export default function AIEditorTestPage() {
  const [user] = useState<AuthUser | null>({
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.GRANT_WRITER,
    organizationId: 'test-org',
    verified: true
  });

  const handleLogout = () => {
    // Mock logout function
    console.log('Logout clicked');
  };

  const handleSave = (content: string) => {
    console.log('Content saved:', content);
  };

  const handleContentChange = (content: string) => {
    console.log('Content changed:', content);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {user && <Sidebar user={user} onLogout={handleLogout} />}
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Editor Test
            </h1>
            <p className="text-gray-600">
              Test the new AI-powered collaborative editor for grant applications
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Executive Summary Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
              <AIEditor
                applicationId="test-app-1"
                grantId="test-grant-1"
                sectionType="executive_summary"
                sectionTitle="Executive Summary"
                initialContent="Write a compelling executive summary for your grant application..."
                onSave={handleSave}
                onContentChange={handleContentChange}
              />
            </div>

            {/* Project Description Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Project Description</h2>
              <AIEditor
                applicationId="test-app-1"
                grantId="test-grant-1"
                sectionType="project_description"
                sectionTitle="Project Description"
                initialContent="Describe your project in detail..."
                onSave={handleSave}
                onContentChange={handleContentChange}
              />
            </div>

            {/* Methodology Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Methodology</h2>
              <AIEditor
                applicationId="test-app-1"
                grantId="test-grant-1"
                sectionType="methodology"
                sectionTitle="Methodology"
                initialContent="Explain your research methodology..."
                onSave={handleSave}
                onContentChange={handleContentChange}
              />
            </div>

            {/* Budget Justification Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Budget Justification</h2>
              <AIEditor
                applicationId="test-app-1"
                grantId="test-grant-1"
                sectionType="budget_justification"
                sectionTitle="Budget Justification"
                initialContent="Justify your budget allocation..."
                onSave={handleSave}
                onContentChange={handleContentChange}
              />
            </div>
          </div>

          <Card className="mt-8 p-6">
            <h3 className="text-lg font-semibold mb-4">AI Editor Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✨ AI Suggestions</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Contextual content recommendations</li>
                  <li>• Real-time writing assistance</li>
                  <li>• Grant requirement compliance</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">💬 AI Assistant</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Chat with AI for guidance</li>
                  <li>• Section-specific help</li>
                  <li>• Writing tips and examples</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-purple-600">🔄 Auto-Save</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Automatic content saving</li>
                  <li>• Version history tracking</li>
                  <li>• Collaborative editing</li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Development Note</h4>
            <p className="text-sm text-yellow-700">
              This is a test page for the AI editor component. In production, this would be integrated 
              into the actual application edit pages with real data and backend connectivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}