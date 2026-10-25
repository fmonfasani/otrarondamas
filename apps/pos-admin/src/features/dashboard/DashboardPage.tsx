import { Card, CardBody, CardHeader } from '../../components';

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Dashboard</h1>

      <Card>
        <CardHeader>
          <h2 className="text-h2 font-bold">Métricas del negocio</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <p className="font-semibold">Panel de métricas en desarrollo</p>
            <p className="text-gray-600">
              Las ventas, los tickets, los clientes y las tendencias todavía no están conectados a
              indicadores calculados desde la API. Los valores se mostrarán cuando exista una fuente
              de datos verificada.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
