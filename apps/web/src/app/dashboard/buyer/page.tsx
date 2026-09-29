import { BuyerDashboard } from '../../../components/dashboard/buyer/buyer-dashboard';
import { AuthGate } from '../../../components/auth/auth-gate';

export default function BuyerDashboardPage() {
  return <AuthGate requiredRole="buyer" redirectTo="/dashboard/buyer"><BuyerDashboard /></AuthGate>;
}
