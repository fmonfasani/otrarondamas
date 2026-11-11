import { Outlet } from '@remix-run/react';

/** Auth screens render their own full-page layout (AuthShell, Figma 145:13208 / 145:13261). */
export default function AuthLayout() {
  return <Outlet />;
}
