import { LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ request }) => {
  const { signal } = request;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue('data: {"type":"connected"}\n\n');

      // Simulated updates (in production, would come from Kafka)
      const interval = setInterval(() => {
        const data = {
          type: 'update',
          timestamp: new Date().toISOString(),
          data: Math.random(),
        };
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      }, 5000);

      signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
