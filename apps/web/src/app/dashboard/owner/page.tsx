import type { Metadata } from 'next';
import { OwnerDashboard } from '../../../components/dashboard/owner/owner-dashboard';
import { AuthGate } from '../../../components/auth/auth-gate';

export const metadata: Metadata = {
  title: 'Owner workspace',
  description: 'Manage your 3D printing work, quotes, and earnings on 3oD.',
};

export default function OwnerDashboardPage() {
  return <AuthGate requiredRole="printer_owner" redirectTo="/dashboard/owner"><OwnerDashboard /></AuthGate>;
}
