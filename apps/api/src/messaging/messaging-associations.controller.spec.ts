jest.mock('./messaging.gateway', () => ({
  MessagingGateway: class MessagingGatewayMock {},
}));

import { MessagingController } from './messaging.controller';
import type { MessagingService } from './messaging.service';
import type { MessagingGateway } from './messaging.gateway';

describe('MessagingController — commercial context P2', () => {
  const user = { id: 'owner-a' } as any;
  const service = {
    listConversationAssociations: jest.fn(),
    createConversationAssociation: jest.fn(),
    deactivateConversationAssociation: jest.fn(),
  } as unknown as MessagingService;
  const gateway = {} as MessagingGateway;
  let controller: MessagingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MessagingController(service, gateway);
  });

  it('lists the active commercial context for the requested conversation', async () => {
    (service.listConversationAssociations as jest.Mock).mockResolvedValue([]);
    await expect(controller.listAssociations(user, 'conversation-a')).resolves.toEqual([]);
    expect(service.listConversationAssociations).toHaveBeenCalledWith(user, 'conversation-a');
  });

  it('creates an association using the validated entity contract', async () => {
    const association = { id: 'association-a', entityType: 'PRODUCT', entityId: 'product-a' };
    (service.createConversationAssociation as jest.Mock).mockResolvedValue(association);
    await expect(controller.createAssociation(user, 'conversation-a', {
      entityType: 'PRODUCT',
      entityId: 'product-a',
      reason: 'Producto elegido desde el chat',
    } as any)).resolves.toEqual(association);
    expect(service.createConversationAssociation).toHaveBeenCalledWith(
      user, 'conversation-a', 'PRODUCT', 'product-a', 'Producto elegido desde el chat',
    );
  });

  it('deactivates instead of physically deleting a historical association', async () => {
    const result = { id: 'association-a', active: false };
    (service.deactivateConversationAssociation as jest.Mock).mockResolvedValue(result);
    await expect(controller.deactivateAssociation(user, 'conversation-a', 'association-a', {
      reason: 'Corrección comercial',
    })).resolves.toEqual(result);
    expect(service.deactivateConversationAssociation).toHaveBeenCalledWith(
      user, 'conversation-a', 'association-a', 'Corrección comercial',
    );
  });
});
