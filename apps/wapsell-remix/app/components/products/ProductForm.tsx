import { Form, useActionData, useNavigation } from '@remix-run/react';

export function ProductForm({ product, isEditing }: { product?: any; isEditing?: boolean }) {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post" className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Name
        </label>
        <input
          type="text"
          name="name"
          defaultValue={product?.name}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price
          </label>
          <input
            type="number"
            name="price"
            step="0.01"
            defaultValue={product?.price}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock
          </label>
          <input
            type="number"
            name="stock"
            defaultValue={product?.stock}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="description"
          defaultValue={product?.description}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {actionData?.error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {actionData.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
      >
        {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
      </button>
    </Form>
  );
}
