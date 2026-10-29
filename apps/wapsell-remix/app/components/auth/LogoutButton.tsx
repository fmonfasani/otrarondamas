import { Form, useParams, useNavigation } from '@remix-run/react';

interface LogoutButtonProps {
  /**
   * Button text - defaults to "Logout" / "Cerrar sesión"
   */
  label?: string;

  /**
   * CSS class for styling
   */
  className?: string;

  /**
   * Show loading state during submission
   */
  showLoading?: boolean;
}

const translations = {
  es: {
    logout: 'Cerrar Sesión',
    logging_out: 'Cerrando sesión...',
  },
  en: {
    logout: 'Logout',
    logging_out: 'Logging out...',
  },
};

/**
 * LogoutButton Component
 *
 * Handles user logout with proper form submission to $lang.auth.logout route.
 * Clears session and redirects to home page.
 *
 * Usage:
 * ```tsx
 * import { LogoutButton } from '~/components/auth/LogoutButton';
 *
 * export function NavBar() {
 *   return (
 *     <nav>
 *       <LogoutButton
 *         className="text-red-600 hover:text-red-700"
 *         label="Sign out"
 *       />
 *     </nav>
 *   );
 * }
 * ```
 */
export function LogoutButton({
  label,
  className = 'text-sm text-gray-600 hover:text-gray-900',
  showLoading = true,
}: LogoutButtonProps) {
  const { lang } = useParams();
  const locale = (lang || 'es') as 'es' | 'en';
  const t = translations[locale] || translations.es;

  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form action={`/${locale}/auth/logout`} method="post">
      <button
        type="submit"
        disabled={isSubmitting}
        className={`${className} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSubmitting && showLoading ? t.logging_out : (label || t.logout)}
      </button>
    </Form>
  );
}

/**
 * LogoutLink Component
 *
 * Alternative inline logout link (useful for dropdowns/menus).
 * Does not use form submission - requires additional protection.
 *
 * Warning: GET-based logout is less secure. Prefer LogoutButton for security.
 */
export function LogoutLink({
  label,
  className = 'text-sm text-gray-600 hover:text-gray-900',
}: Omit<LogoutButtonProps, 'showLoading'>) {
  const { lang } = useParams();
  const locale = (lang || 'es') as 'es' | 'en';
  const t = translations[locale] || translations.es;

  return (
    <a href={`/${locale}/auth/logout`} className={className}>
      {label || t.logout}
    </a>
  );
}
