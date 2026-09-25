import type { Metadata } from 'next';
import { OwnerDashboard } from '../../../components/dashboard/owner/owner-dashboard';

export const metadata: Metadata = {
  title: 'Owner workspace',
  description: 'Manage your 3D printing work, quotes, and earnings on 3oD.',
};

export default function OwnerDashboardPage() {
  return <OwnerDashboard />;
}
