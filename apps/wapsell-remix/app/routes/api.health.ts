import { json, type LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async () => {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
