import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { broadcastToEmpresa } from './websocket.server';

let kafka: Kafka | null = null;
let consumer: Consumer | null = null;
let isRunning = false;

type KafkaPayload = Record<string, unknown>;

function isKafkaPayload(value: unknown): value is KafkaPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSaslConfig() {
  if (process.env.KAFKA_SASL_ENABLED !== 'true') return undefined;
  const username = process.env.KAFKA_SASL_USERNAME || '';
  const password = process.env.KAFKA_SASL_PASSWORD || '';
  switch (process.env.KAFKA_SASL_MECHANISM) {
    case 'scram-sha-256':
      return { mechanism: 'scram-sha-256' as const, username, password };
    case 'scram-sha-512':
      return { mechanism: 'scram-sha-512' as const, username, password };
    case 'plain':
    default:
      return { mechanism: 'plain' as const, username, password };
  }
}

export async function initKafka() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: 'wapsell-frontend',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: getSaslConfig(),
    });
    consumer = kafka.consumer({ groupId: 'wapsell-frontend-group' });
  }
  return kafka;
}

export async function startKafkaConsumer() {
  try {
    if (!consumer) await initKafka();
    if (isRunning) return;
    await consumer!.connect();
    await consumer!.subscribe({
      topics: ['orders.created', 'orders.updated', 'inventory.updated', 'notifications.sent'],
      fromBeginning: false,
    });
    await consumer!.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        try {
          const rawValue = message.value?.toString() || '';
          const parsed: unknown = JSON.parse(rawValue);
          if (!isKafkaPayload(parsed)) throw new Error('Kafka message payload must be an object');
          const empresaId = parsed.empresaId;
          if (typeof empresaId !== 'string' || !empresaId) throw new Error('Kafka message is missing empresaId');
          switch (topic) {
            case 'orders.created': broadcastToEmpresa(empresaId, 'order:created', parsed); break;
            case 'orders.updated': broadcastToEmpresa(empresaId, 'order:updated', parsed); break;
            case 'inventory.updated': broadcastToEmpresa(empresaId, 'inventory:updated', parsed); break;
            case 'notifications.sent': broadcastToEmpresa(empresaId, 'notification', parsed); break;
          }
        } catch (error) {
          console.error('[Kafka] Error processing message:', error);
        }
      },
    });
    isRunning = true;
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
    }
  } catch (error) {
    console.error('[Kafka] Error stopping consumer:', error);
  }
}

export function isKafkaRunning() {
  return isRunning;
}

export async function publishToKafka(topic: string, data: KafkaPayload) {
  try {
    if (!kafka) await initKafka();
    const producer = kafka!.producer();
    await producer.connect();
    await producer.send({
      topic,
      messages: [{
        key: typeof data.empresaId === 'string' ? data.empresaId : 'default',
        value: JSON.stringify(data),
      }],
    });
    await producer.disconnect();
  } catch (error) {
    console.error('[Kafka] Error publishing message:', error);
    throw error;
  }
}
