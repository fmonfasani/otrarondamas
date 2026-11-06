import { MODULE_METADATA } from '@nestjs/common/constants';
import { PERMISSION_KEY } from '../auth/decorators/require-permission.decorator';
import { PaymentsController } from './payments.controller';
import { PaymentsModule } from './payments.module';
import { SalesModule } from '../sales/sales.module';

describe('PaymentsModule routing registration', () => {
  it('registers the sale-scoped PaymentsController and its SalesService dependency module', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      PaymentsModule,
    ) as unknown[];
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      PaymentsModule,
    ) as unknown[];

    expect(controllers).toContain(PaymentsController);
    expect(imports).toContain(SalesModule);
    expect(Reflect.getMetadata(PERMISSION_KEY, PaymentsController.prototype.findAll)).toBe(
      'ventas.ver',
    );
  });
});
