import { Test, TestingModule } from '@nestjs/testing';
import { BusinessContextModule } from '../business-context/business-context.module';
import { MessagingModule } from './messaging.module';
import { MessagingGateway } from './messaging.gateway';

jest.mock('../auth/auth-jwt.module', () => ({
  AuthJwtModule: class AuthJwtModuleMock {},
}));

describe('MessagingModule', () => {
  it('declares the canonical BusinessContextModule dependency', () => {
    const metadata = Reflect.getMetadata('imports', MessagingModule) as unknown[];

    expect(metadata).toContain(BusinessContextModule);
  });

  it('can be compiled without introducing persistence dependencies', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MessagingModule],
    })
      .overrideProvider(MessagingGateway)
      .useValue({})
      .compile();

    expect(moduleRef).toBeDefined();
  });
});
