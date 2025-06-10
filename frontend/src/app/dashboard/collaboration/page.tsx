'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Users, Activity, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with real-time features
const TeamCollaborationHub = dynamic(
  () => import('@/components/collaboration/TeamCollaborationHub'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collaboration workspace...</p>
        </div>
      </div>
    )
  }
);

export default function CollaborationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-lg font-semibold text-gray-900">Team Collaboration</h1>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Quick Stats */}
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>4 team members</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Activity className="w-4 h-4" />
                <span>3 active now</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Auto-save enabled</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Secure workspace</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collaboration Hub */}
      <TeamCollaborationHub />
    </div>
  );
}