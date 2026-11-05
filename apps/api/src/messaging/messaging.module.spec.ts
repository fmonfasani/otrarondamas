await jest.unstable_mockModule('../auth/auth-jwt.module', () => ({
  AuthJwtModule: class AuthJwtModuleMock {},
}));

await jest.unstable_mockModule('./messaging.gateway', () => ({
  MessagingGateway: class MessagingGatewayMock {},
}));

import { Test, TestingModule } from '@nestjs/testing';
const { BusinessContextModule } = await import('../business-context/business-context.module');
const { MessagingModule } = await import('./messaging.module');

describe('MessagingModule', () => {
  it('declares the canonical BusinessContextModule dependency', () => {
    const metadata = Reflect.getMetadata('imports', MessagingModule) as unknown[];

    expect(metadata).toContain(BusinessContextModule);
  });

  it('compiles with the existing Commerce engine dependency', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MessagingModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });
});
