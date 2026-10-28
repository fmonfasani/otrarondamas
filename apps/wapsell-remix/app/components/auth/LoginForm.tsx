import { Form, useActionData, useNavigation } from '@remix-run/react';

interface ActionData {
  error?: string;
}

export function LoginForm() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="user@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          name="password"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="rememberMe"
          id="rememberMe"
          className="h-4 w-4 text-blue-600"
        />
        <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
          Remember me
        </label>
      </div>

      {actionData?.error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {actionData.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isSubmitting ? 'Loading...' : 'Sign In'}
      </button>

      <p className="text-center text-sm text-gray-600">
        <a href="#forgot" className="text-blue-600 hover:underline">
          Forgot password?
        </a>
      </p>
    </Form>
  );
}
