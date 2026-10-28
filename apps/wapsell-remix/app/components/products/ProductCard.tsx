interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ProductCard({
  id,
  name,
  price,
  stock,
  image,
  onEdit,
  onDelete,
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl">📦</div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="text-2xl font-bold text-blue-600 mt-2">${price}</p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Stock</p>
            <p className={`text-lg font-semibold ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock} units
            </p>
          </div>

          <div className="space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(id)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
