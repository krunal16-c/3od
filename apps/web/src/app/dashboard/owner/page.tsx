import type { Metadata } from 'next';
import { OwnerDashboard } from '../../../components/dashboard/owner/owner-dashboard';
import { AuthGate } from '../../../components/auth/auth-gate';

export const metadata: Metadata = {
  title: 'Owner workspace',
  description: 'Manage your manufacturing work, quotes, and machine capacity on 3oD.',
};

export default function OwnerDashboardPage() {
  return <AuthGate requiredRole="printer_owner" redirectTo="/dashboard/owner"><OwnerDashboard /></AuthGate>;
}
