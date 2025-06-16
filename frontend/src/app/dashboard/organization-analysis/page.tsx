'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../components/layout/Sidebar";
import { User, UserRole, hasPermission } from "../../../lib/auth";

// Since the OrganizationScrapingInterface component doesn't exist yet, 
// let's create a simple placeholder that matches the admin interface style
function OrganizationAnalysisInterface() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Organization Analysis
        </h1>
        <p className="text-gray-600">
          Analyze organization websites and extract key information for grant matching
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Website URL
            </label>
            <div className="flex space-x-4">
              <input
                type="url"
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Analyze
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Enter the organization's website URL. If it doesn't start with https://, we'll add it automatically.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
            <div className="text-gray-500 text-center py-8">
              Enter a URL above to start analyzing an organization
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationAnalysisPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Check if user has permission to access organization analysis
      if (!hasPermission(userData, 'canViewAllOrganizations') && userData.role !== UserRole.SUPER_ADMIN) {
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/auth/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <OrganizationAnalysisInterface />
      </div>
    </div>
  );
}