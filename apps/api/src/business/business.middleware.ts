import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const handle = req.params.handle;

    if (handle) {
      try {
        const empresa = await this.prisma.empresa.findUnique({
          where: { handle },
          select: { id: true },
        });

        if (!empresa) {
          return res.status(404).json({
            error: 'Business not found',
            message: `No business found with handle: ${handle}`,
          });
        }

        req['businessId'] = empresa.id;
        req['businessHandle'] = handle;
      } catch (error) {
        return res.status(500).json({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }

    next();
  }
}
