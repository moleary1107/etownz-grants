'use client';

import React from 'react';
import WorkflowManagement from '../../../components/review/WorkflowManagement';
import { Sidebar } from '../../../components/layout/Sidebar';
import { UserRole, User } from '../../../lib/auth';

export default function WorkflowManagementPage() {
  // For now, we'll use a mock user. In a real app, this would come from auth context
  const mockUser: User = {
    id: 1,
    name: "Admin User",
    email: "admin@etownz.com",
    role: UserRole.SUPER_ADMIN,
    organization: null,
    permissions: []
  };

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logout clicked');
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={mockUser} onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        <WorkflowManagement />
      </div>
    </div>
  );
}