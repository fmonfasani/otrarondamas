import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PersonaDetector } from './persona-detector';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, PersonaDetector],
  exports: [ChatService, PersonaDetector],
})
export class ChatModule {}
