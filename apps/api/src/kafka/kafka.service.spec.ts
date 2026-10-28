import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService } from './kafka.service';

describe('KafkaService', () => {
  let service: KafkaService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaService, { provide: 'KAFKA_SERVICE', useValue: mockClient }],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
  });

  it('should publish order created event', async () => {
    const orderData = { id: '123', empresaId: '456', total: 100 };
    await service.publishOrderCreated(orderData);
    expect(mockClient.emit).toHaveBeenCalledWith('orders.created', expect.any(String));
  });

  it('should publish order updated event', async () => {
    await service.publishOrderUpdated('123', { status: 'completed' });
    expect(mockClient.emit).toHaveBeenCalledWith('orders.updated', expect.any(String));
  });

  it('should publish inventory updated event', async () => {
    await service.publishInventoryUpdated('prod-123', 50, 'emp-456');
    expect(mockClient.emit).toHaveBeenCalledWith('inventory.updated', expect.any(String));
  });

  it('should publish notification', async () => {
    await service.publishNotification('user-123', 'emp-456', 'Order completed');
    expect(mockClient.emit).toHaveBeenCalledWith('notifications.sent', expect.any(String));
  });
});
