'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../../../components/layout/Sidebar";
import { User, UserRole, hasPermission } from "../../../../lib/auth";
import AutomationMonitoringDashboard from "../../../../components/dashboard/AutomationMonitoringDashboard";

export default function AutomationMonitoringPage() {
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
      
      // Check if user has permission to access automation monitoring
      if (!hasPermission(userData, 'canViewSystemMonitoring') && userData.role !== UserRole.SUPER_ADMIN) {
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
        <AutomationMonitoringDashboard />
      </div>
    </div>
  );
}