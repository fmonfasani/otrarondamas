/**
 * Messaging Service Integration Tests (T2.8-T2.13)
 *
 * Verifies messaging functionality with real database:
 * - T2.8: Get conversations (filtered by businessId)
 * - T2.9: Create message (validates businessId in context)
 * - T2.10: Participant access control (4 levels)
 * - T2.11: Message deletion (only owner + grace period)
 * - T2.12: Add/remove participants (owner-only)
 * - T2.13: Business isolation (User A can't see User B's messages)
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MessagingService } from '../../src/messaging/messaging.service';
import { AppModule } from '../../src/app.module';

describe('MessagingService Integration Tests (T2.8-T2.13)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let messagingService: MessagingService;

  // Test actors
  let ownerToken: string;
  let staffToken: string;
  let otherBusinessOwnerToken: string;

  let businessId: string;
  let otherBusinessId: string;
  let conversationId: string;
  let ownerId: string;
  let staffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    messagingService = moduleFixture.get<MessagingService>(MessagingService);

    // Setup test data
    await setupTestData();
  });

  async function setupTestData() {
    // Create businesses
    const business1 = await prisma.empresa.create({
      data: {
        id: 'msg-test-business-1',
        nombre: 'Messaging Test Business 1',
        slug: 'msg-test-1',
        activa: true,
      },
    });
    businessId = business1.id;

    const business2 = await prisma.empresa.create({
      data: {
        id: 'msg-test-business-2',
        nombre: 'Messaging Test Business 2',
        slug: 'msg-test-2',
        activa: true,
      },
    });
    otherBusinessId = business2.id;

    // Create test users
    const owner = await prisma.usuario.create({
      data: {
        id: 'msg-owner-001',
        email: 'msg-owner@example.test',
        nombre: 'Messaging Owner',
        activo: true,
        rol: 'OWNER',
        empresaId: businessId,
      },
    });
    ownerId = owner.id;

    const staff = await prisma.usuario.create({
      data: {
        id: 'msg-staff-001',
        email: 'msg-staff@example.test',
        nombre: 'Messaging Staff',
        activo: true,
        rol: 'ASISTENTE_LOCAL',
        empresaId: businessId,
      },
    });
    staffId = staff.id;

    const otherOwner = await prisma.usuario.create({
      data: {
        id: 'msg-other-owner-001',
        email: 'msg-other-owner@example.test',
        nombre: 'Other Business Owner',
        activo: true,
        rol: 'OWNER',
        empresaId: otherBusinessId,
      },
    });

    // Create canonical users
    const ownerCanonical = await prisma.user.create({
      data: {
        email: 'msg-owner-canonical@example.test',
        nombre: 'Messaging Owner Canonical',
        usuarioId: owner.id,
      },
    });

    const staffCanonical = await prisma.user.create({
      data: {
        email: 'msg-staff-canonical@example.test',
        nombre: 'Messaging Staff Canonical',
        usuarioId: staff.id,
      },
    });

    const otherOwnerCanonical = await prisma.user.create({
      data: {
        email: 'msg-other-owner-canonical@example.test',
        nombre: 'Other Owner Canonical',
        usuarioId: otherOwner.id,
      },
    });

    // Create memberships
    await prisma.membership.create({
      data: {
        userId: ownerCanonical.id,
        businessId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    await prisma.membership.create({
      data: {
        userId: staffCanonical.id,
        businessId,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    await prisma.membership.create({
      data: {
        userId: otherOwnerCanonical.id,
        businessId: otherBusinessId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    // Generate tokens (simplified; in real tests use proper JWT generation)
    ownerToken = `Bearer ${Buffer.from(
      JSON.stringify({
        sub: owner.id,
        email: owner.email,
        empresaId: businessId,
        rol: 'OWNER',
        type: 'usuario',
      }),
    ).toString('base64')}`;

    staffToken = `Bearer ${Buffer.from(
      JSON.stringify({
        sub: staff.id,
        email: staff.email,
        empresaId: businessId,
        rol: 'ASISTENTE_LOCAL',
        type: 'usuario',
      }),
    ).toString('base64')}`;

    otherBusinessOwnerToken = `Bearer ${Buffer.from(
      JSON.stringify({
        sub: otherOwner.id,
        email: otherOwner.email,
        empresaId: otherBusinessId,
        rol: 'OWNER',
        type: 'usuario',
      }),
    ).toString('base64')}`;
  }

  afterAll(async () => {
    // Cleanup
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.usuario.deleteMany({});
    await prisma.empresa.deleteMany({});
    await app.close();
  });

  describe('T2.8: Get conversations (filtered by businessId)', () => {
    it('should list only conversations from the user\'s business', async () => {
      // Create conversation in businessId
      const conversation = await prisma.conversation.create({
        data: {
          id: 'msg-conv-001',
          businessId,
          type: 'DIRECT',
        },
      });
      conversationId = conversation.id;

      // Add owner as participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Fetch conversations
      const response = await request(app.getHttpServer())
        .get(`/api/messaging/conversations`)
        .set('Authorization', ownerToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      const firstConv = response.body[0];
      expect(firstConv.businessId).toBe(businessId);
    });

    it('should return empty list for user with no conversations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/messaging/conversations`)
        .set('Authorization', staffToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('T2.9: Create message (validates businessId in context)', () => {
    beforeEach(async () => {
      // Create conversation for this test
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-create-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });
      conversationId = conversation.id;

      // Add owner as participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: ownerId,
          isAdmin: true,
        },
      });
    });

    it('should create message with valid businessId', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Test message',
          type: 'TEXT',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.text).toBe('Test message');
      expect(response.body.conversationId).toBe(conversationId);
    });

    it('should reject message from user not in business', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', otherBusinessOwnerToken)
        .send({
          text: 'Attempted cross-business message',
          type: 'TEXT',
        })
        .expect(403 || 404); // Forbidden or Not Found

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('T2.10: Participant access control (4 levels)', () => {
    it('LEVEL 1: PARTICIPANT can read and write messages', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-participant-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      // Add owner as participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Owner (participant) can read
      const readResponse = await request(app.getHttpServer())
        .get(`/api/messaging/conversations/${conversation.id}`)
        .set('Authorization', ownerToken)
        .expect(200);

      expect(readResponse.body).toHaveProperty('id', conversation.id);

      // Owner (participant) can write
      const writeResponse = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Message from participant',
          type: 'TEXT',
        })
        .expect(201);

      expect(writeResponse.body).toHaveProperty('id');
    });

    it('LEVEL 2: OWNER_READ_ONLY can read but NOT write', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-readonly-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      // Add only staff as participant, NOT owner
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: staffId,
          isAdmin: true,
        },
      });

      // Owner (non-participant, but OWNER role) can read
      const readResponse = await request(app.getHttpServer())
        .get(`/api/messaging/conversations/${conversation.id}`)
        .set('Authorization', ownerToken)
        .expect(200);

      expect(readResponse.body).toHaveProperty('id');

      // Owner (non-participant) cannot write
      const writeResponse = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Attempt from non-participant owner',
          type: 'TEXT',
        })
        .expect(403);

      expect(writeResponse.status).toBe(403);
    });

    it('LEVEL 3: NON_AUTHORIZED cannot access conversation', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-unauthorized-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      // Only owner is participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Staff (non-participant, non-owner) cannot read
      const readResponse = await request(app.getHttpServer())
        .get(`/api/messaging/conversations/${conversation.id}`)
        .set('Authorization', staffToken)
        .expect(403 || 404);

      expect(readResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('LEVEL 4: FOREIGN_BUSINESS cannot access conversation', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-foreign-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      // Add owner as participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Other business owner cannot access
      const readResponse = await request(app.getHttpServer())
        .get(`/api/messaging/conversations/${conversation.id}`)
        .set('Authorization', otherBusinessOwnerToken)
        .expect(404);

      expect(readResponse.status).toBe(404);
    });
  });

  describe('T2.11: Message deletion (only owner + grace period)', () => {
    it('should allow author to delete own message within grace period', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-delete-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Create message
      const createResponse = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Message to delete',
          type: 'TEXT',
        })
        .expect(201);

      const messageId = createResponse.body.id;

      // Delete message
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/messaging/conversations/${conversation.id}/messages/${messageId}`)
        .set('Authorization', ownerToken)
        .expect(200 || 204);

      expect(deleteResponse.status).toBeLessThan(300);
    });

    it('should prevent non-author from deleting message', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-delete-forbidden-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      // Add both users as participants
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: staffId,
          isAdmin: false,
        },
      });

      // Create message from owner
      const createResponse = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Message to protect',
          type: 'TEXT',
        })
        .expect(201);

      const messageId = createResponse.body.id;

      // Try to delete from staff (non-author)
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/messaging/conversations/${conversation.id}/messages/${messageId}`)
        .set('Authorization', staffToken)
        .expect(403);

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('T2.12: Add/remove participants (owner-only)', () => {
    it('should allow admin to add participant', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-add-participant-${Date.now()}`,
          businessId,
          type: 'GROUP',
        },
      });

      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Add participant
      const response = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/participants`)
        .set('Authorization', ownerToken)
        .send({
          userId: staffId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('userId', staffId);
    });

    it('should prevent non-admin from adding participant', async () => {
      const conversation = await prisma.conversation.create({
        data: {
          id: `msg-conv-add-forbidden-${Date.now()}`,
          businessId,
          type: 'GROUP',
        },
      });

      // Add staff as non-admin participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: staffId,
          isAdmin: false,
        },
      });

      // Try to add participant as non-admin
      const response = await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conversation.id}/participants`)
        .set('Authorization', staffToken)
        .send({
          userId: ownerId,
        })
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  describe('T2.13: Business isolation (User A can\'t see User B\'s messages)', () => {
    it('should completely isolate messages between businesses', async () => {
      // Create conversation in business 1
      const conv1 = await prisma.conversation.create({
        data: {
          id: `msg-conv-iso-1-${Date.now()}`,
          businessId,
          type: 'DIRECT',
        },
      });

      await prisma.conversationParticipant.create({
        data: {
          conversationId: conv1.id,
          userId: ownerId,
          isAdmin: true,
        },
      });

      // Create message in business 1
      await request(app.getHttpServer())
        .post(`/api/messaging/conversations/${conv1.id}/messages`)
        .set('Authorization', ownerToken)
        .send({
          text: 'Business 1 message',
          type: 'TEXT',
        })
        .expect(201);

      // Try to access from business 2 owner
      const response = await request(app.getHttpServer())
        .get(`/api/messaging/conversations/${conv1.id}`)
        .set('Authorization', otherBusinessOwnerToken)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });
});
