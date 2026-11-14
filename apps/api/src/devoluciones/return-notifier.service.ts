import { Injectable } from '@nestjs/common';
import { CustomerNoticeService } from '../customer-notices/customer-notice.service';

/**
 * OR-B4-035 rule 12 — each step of a return posts a message in the customer's conversation,
 * once per return and step (`devolucion-<id>-<step>`). Best effort.
 */
@Injectable()
export class ReturnNotifierService {
  constructor(private readonly notices: CustomerNoticeService) {}

  notify(companyId: string, customerId: string, returnId: string, step: string, text: string) {
    return this.notices.notify(companyId, customerId, `devolucion-${returnId}-${step}`, text);
  }
}
