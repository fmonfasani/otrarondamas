import { Card, CardBody, CardHeader } from '../components';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

export const DashboardPage = () => {
  const metrics = [
    {
      title: 'Ventas Hoy',
      value: '$4,250',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Tickets',
      value: '42',
      icon: BarChart3,
      color: 'text-blue-600',
    },
    {
      title: 'Clientes',
      value: '128',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Crecimiento',
      value: '+12.5%',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardBody className="flex items-center gap-4">
                <div className={`p-3 bg-gray-100 rounded-lg ${metric.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-small text-gray-600">{metric.title}</p>
                  <p className="text-h3 font-bold">{metric.value}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="text-h2 font-bold">Actividad Reciente</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <p className="text-gray-600">Sistema funcionando correctamente ✓</p>
            <p className="text-gray-600">Componentes UI implementados ✓</p>
            <p className="text-gray-600">Punto de Venta operativo ✓</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
