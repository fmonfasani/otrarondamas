import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'otrarondamas-api',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            ssl: process.env.KAFKA_SSL === 'true',
            ...(process.env.KAFKA_SASL_ENABLED === 'true' && {
              sasl: {
                mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
                username: process.env.KAFKA_SASL_USERNAME,
                password: process.env.KAFKA_SASL_PASSWORD,
              } as any,
            }),
          },
          consumer: {
            groupId: 'otrarondamas-api-group',
          },
        },
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
