import { json, redirect } from '@remix-run/node';
import {
  getDashboardKPIs,
  getTrendChart,
  getTopProducts,
  getChannelBreakdown,
  getGeographicBreakdown,
  DashboardAPIError
} from '~/services/dashboard.client';
import { requireAuth, getAuthenticatedUser } from '~/services/auth.server';

/**
 * Analytics data loader for dashboard analytics page
 * Fetches trend data, top products, and channel breakdown
 */
export async function loadAnalyticsData(request: Request) {
  try {
    const token = await requireAuth(request);

    const [trends, topProducts, channelBreakdown] = await Promise.all([
      getTrendChart(token, 'revenue', '30d'),
      getTopProducts(token, 10, 'revenue'),
      getChannelBreakdown(token, '30d'),
    ]);

    return json({
      trends,
      topProducts,
      channelBreakdown,
    });
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      if (error.statusCode === 401) {
        throw redirect('/login');
      }
      if (error.statusCode === 403) {
        throw redirect('/forbidden');
      }
    }

    console.error('[analytics] Loader error:', error);
    throw new Response('Failed to load analytics', { status: 500 });
  }
}

/**
 * Geographic breakdown loader for location-based analytics
 */
export async function loadGeographicData(request: Request) {
  try {
    const token = await requireAuth(request);
    const geoData = await getGeographicBreakdown(token, '30d');

    return json({
      geographic: geoData,
    });
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      if (error.statusCode === 401) {
        throw redirect('/login');
      }
      if (error.statusCode === 403) {
        throw redirect('/forbidden');
      }
    }

    console.error('[geographic] Loader error:', error);
    throw new Response('Failed to load geographic data', { status: 500 });
  }
}

/**
 * Settings/tenant loader for user settings page
 * Fetches current user and tenant information
 */
export async function loadSettingsData(request: Request) {
  try {
    const token = await requireAuth(request);
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw redirect('/login');
    }

    return json({
      user,
      tenantId: user.empresaId,
      tenantName: user.empresaNombre,
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    console.error('[settings] Loader error:', error);
    throw new Response('Failed to load settings', { status: 500 });
  }
}

/**
 * Users list loader for team management page
 * Fetches list of users in the current tenant (future implementation)
 */
export async function loadUsersData(request: Request) {
  try {
    const token = await requireAuth(request);
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw redirect('/login');
    }

    // TODO: implement GET /users?tenantId=X endpoint in API
    // For now, return current user
    return json({
      currentUser: user,
      users: [user],
      tenantId: user.empresaId,
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    console.error('[users] Loader error:', error);
    throw new Response('Failed to load users', { status: 500 });
  }
}

/**
 * Combined dashboard loader (KPIs + trends + channel breakdown)
 * Useful for dashboard._index or dashboard layouts that need multiple data sources
 */
export async function loadCompleteDashboardData(request: Request) {
  try {
    const token = await requireAuth(request);

    const [kpis, trends, channelBreakdown, geographic] = await Promise.all([
      getDashboardKPIs(token, '30d'),
      getTrendChart(token, 'revenue', '30d'),
      getChannelBreakdown(token, '30d'),
      getGeographicBreakdown(token, '30d'),
    ]);

    return json({
      kpis,
      trends,
      channelBreakdown,
      geographic,
    });
  } catch (error) {
    if (error instanceof DashboardAPIError) {
      if (error.statusCode === 401) {
        throw redirect('/login');
      }
      if (error.statusCode === 403) {
        throw redirect('/forbidden');
      }

      console.error('[dashboard] API error:', error.message);
      return json(
        {
          kpis: null,
          trends: null,
          channelBreakdown: null,
          geographic: null,
          error: error.message,
        },
        { status: 200 }
      );
    }

    console.error('[dashboard] Unexpected error:', error);
    throw new Response('Failed to load dashboard', { status: 500 });
  }
}
