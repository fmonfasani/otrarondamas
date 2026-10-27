import { LoaderFunction, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
  const token = await requireAuth(request);

  // Fetch dashboard data from NestJS API
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    return json({ data: null }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${apiUrl}/dashboard/kpis`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return json({ data: null }, { status: 500 });
    }

    const data = await response.json();
    return json({ data });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return json({ data: null }, { status: 500 });
  }
};

export default function DashboardPage() {
  const { data } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI cards will go here */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">KPI 1</h2>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">KPI 2</h2>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">KPI 3</h2>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">KPI 4</h2>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
      </div>
    </div>
  );
}
