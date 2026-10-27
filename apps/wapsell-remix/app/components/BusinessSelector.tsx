import { useEmpresaName, useEmpresaId } from '~/hooks/useTenant';

export function BusinessSelector() {
  const empresaName = useEmpresaName();
  const empresaId = useEmpresaId();

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
      <span className="text-sm font-medium text-gray-700">
        Negocio:
      </span>
      <div className="px-3 py-1 bg-white border border-gray-300 rounded-md">
        <span className="font-semibold">{empresaName}</span>
        <span className="text-xs text-gray-500 ml-2">(ID: {empresaId})</span>
      </div>
    </div>
  );
}
