import { ReactNode } from 'react';

// Force all dashboard pages to be dynamically rendered
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return children;
}