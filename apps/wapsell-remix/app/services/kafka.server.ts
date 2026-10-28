import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { getIO, broadcastToEmpresa } from './websocket.server';

let kafka: Kafka | null = null;
let consumer: Consumer | null = null;
let isRunning = false;

export async function initKafka() {
  if (!kafka) {
    const saslConfig = process.env.KAFKA_SASL_ENABLED === 'true'
      ? {
          mechanism: (process.env.KAFKA_SASL_MECHANISM || 'plain') as any,
          username: process.env.KAFKA_SASL_USERNAME || '',
          password: process.env.KAFKA_SASL_PASSWORD || '',
        }
      : undefined;

    kafka = new Kafka({
      clientId: 'wapsell-frontend',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: saslConfig,
    });

    consumer = kafka.consumer({ groupId: 'wapsell-frontend-group' });
  }

  return kafka;
}

export async function startKafkaConsumer() {
  try {
    if (!consumer) {
      await initKafka();
    }

    if (isRunning) {
      console.log('[Kafka] Consumer already running');
      return;
    }

    await consumer!.connect();
    console.log('[Kafka] Consumer connected');

    // Subscribe to topics
    await consumer!.subscribe({
      topics: [
        'orders.created',
        'orders.updated',
        'inventory.updated',
        'notifications.sent',
      ],
      fromBeginning: false,
    });

    // Message handler
    await consumer!.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          const value = message.value?.toString() || '';
          const data = JSON.parse(value);

          console.log(`[Kafka] Received from ${topic}:`, data);

          // Route message to appropriate WebSocket event
          switch (topic) {
            case 'orders.created':
              broadcastToEmpresa(data.empresaId, 'order:created', data);
              break;

            case 'orders.updated':
              broadcastToEmpresa(data.empresaId, 'order:updated', data);
              break;

            case 'inventory.updated':
              broadcastToEmpresa(data.empresaId, 'inventory:updated', data);
              break;

            case 'notifications.sent':
              broadcastToEmpresa(data.empresaId, 'notification', data);
              break;
          }
        } catch (error) {
          console.error('[Kafka] Error processing message:', error);
        }
      },
    });

    isRunning = true;
    console.log('[Kafka] Consumer started and listening');
  } catch (error) {
    console.error('[Kafka] Error starting consumer:', error);
    throw error;
  }
}

export async function stopKafkaConsumer() {
  try {
    if (consumer) {
      await consumer.disconnect();
      isRunning = false;
      console.log('[Kafka] Consumer stopped');
    }
  } catch (error) {
    console.error('[Kafka] Error stopping consumer:', error);
  }
}

export function isKafkaRunning() {
  return isRunning;
}

export async function publishToKafka(topic: string, data: any) {
  try {
    if (!kafka) {
      await initKafka();
    }

    const producer = kafka!.producer();
    await producer.connect();

    await producer.send({
      topic,
      messages: [
        {
          key: data.empresaId || 'default',
          value: JSON.stringify(data),
        },
      ],
    });

    await producer.disconnect();
    console.log(`[Kafka] Published to ${topic}:`, data);
  } catch (error) {
    console.error('[Kafka] Error publishing message:', error);
    throw error;
  }
}
