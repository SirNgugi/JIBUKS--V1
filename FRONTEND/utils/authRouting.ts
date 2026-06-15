import type { User } from '@/services/api';
import apiService from '@/services/api';

type AppRoute = '/business-tabs' | '/family-setup' | '/(tabs)' | '/welcome' | '/account-type';

/**
 * Returns the destination route for authenticated users based on tenant type and setup status.
 */
export async function getAuthenticatedHomeRoute(user: User | null, fallbackRoute: AppRoute = '/welcome'): Promise<AppRoute> {
  const tenantType = user?.tenantType;

  if (tenantType === 'BUSINESS') {
    return '/business-tabs';
  }

  if (tenantType === 'FAMILY') {
    try {
      // Check if user has existing family data
      const familyData = await apiService.getFamily();
      
      // If family exists and has a name, user is not first-time - go to dashboard
      if (familyData && familyData.name) {
        return '/(tabs)';
      }
      
      // First-time family user - go to setup
      return '/family-setup';
    } catch (error) {
      // If there's an error fetching family data, assume first-time user
      console.log('Error checking family data, assuming first-time user:', error);
      return '/family-setup';
    }
  }

  return fallbackRoute;
}
