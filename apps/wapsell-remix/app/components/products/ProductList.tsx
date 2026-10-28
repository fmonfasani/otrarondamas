import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

export function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          onEdit={(id) => console.log('Edit:', id)}
          onDelete={(id) => console.log('Delete:', id)}
        />
      ))}
    </div>
  );
}
