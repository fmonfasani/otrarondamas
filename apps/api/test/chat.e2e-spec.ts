import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

describe('Chat API E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockUser = {
    id: uuidv4(),
    email: 'test@example.com',
  };

  const mockBusiness = {
    id: uuidv4(),
    name: 'Test Business',
  };

  let validToken = '';
  let sessionId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // In a real test, you'd generate a valid JWT token
    // For now, we'll use a mock token (tests should use actual auth)
    validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mock
  });

  afterAll(async () => {
    // Cleanup
    await app.close();
  });

  describe('POST /chat/message', () => {
    it('should send a message and receive AI response', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'How much does this property cost?',
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.response).toBeDefined();
      expect(response.body.session_id).toBeDefined();
      expect(response.body.persona).toBeDefined();
      expect(response.body.metadata).toBeDefined();

      sessionId = response.body.session_id;
    });

    it('should reject empty message', async () => {
      await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: '',
        })
        .expect(400);
    });

    it('should reject message exceeding max length', async () => {
      const longMessage = 'a'.repeat(2001);

      await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: longMessage,
        })
        .expect(400);
    });

    it('should reject unauthorized request', async () => {
      await request(app.getHttpServer())
        .post('/chat/message')
        .send({
          message: 'Hello',
        })
        .expect(401);
    });

    it('should detect buyer persona correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'How does this property compare to competitors? Can you provide detailed analysis?',
        })
        .expect(200);

      expect(response.body.persona).toBeDefined();
      expect(response.body.persona.persona_type).toBeDefined();
      expect(response.body.persona.confidence).toBeGreaterThan(0);
      expect(response.body.persona.characteristics).toBeDefined();
      expect(Array.isArray(response.body.persona.characteristics)).toBe(true);
    });

    it('should use provided session_id', async () => {
      // First, get a session_id from a previous message
      const firstResponse = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'First message',
        })
        .expect(200);

      const sessionId = firstResponse.body.session_id;

      // Send another message to the same session
      const secondResponse = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'Second message',
          session_id: sessionId,
        })
        .expect(200);

      expect(secondResponse.body.session_id).toBe(sessionId);
    });

    it('should include metadata with response', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'Hello',
        })
        .expect(200);

      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.model).toBeDefined();
      expect(response.body.metadata.response_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /chat/session/:sessionId/history', () => {
    it('should retrieve chat history', async () => {
      // First create a session with messages
      const createResponse = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'What is the price?',
        })
        .expect(200);

      const sessionId = createResponse.body.session_id;

      // Retrieve history
      const response = await request(app.getHttpServer())
        .get(`/chat/session/${sessionId}/history`)
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.session_id).toBe(sessionId);
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.total_count).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthorized request', async () => {
      await request(app.getHttpServer())
        .get(`/chat/session/${uuidv4()}/history`)
        .expect(401);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get(`/chat/session/${uuidv4()}/history`)
        .set('Authorization', validToken)
        .expect(404);
    });
  });

  describe('DELETE /chat/session/:sessionId', () => {
    it('should delete a chat session', async () => {
      // First create a session
      const createResponse = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'Test message',
        })
        .expect(200);

      const sessionId = createResponse.body.session_id;

      // Delete the session
      const response = await request(app.getHttpServer())
        .delete(`/chat/session/${sessionId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBe('Session deleted successfully');
      expect(response.body.session_id).toBe(sessionId);
      expect(response.body.deleted_at).toBeDefined();
    });

    it('should reject unauthorized request', async () => {
      await request(app.getHttpServer())
        .delete(`/chat/session/${uuidv4()}`)
        .expect(401);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .delete(`/chat/session/${uuidv4()}`)
        .set('Authorization', validToken)
        .expect(404);
    });
  });

  describe('GET /chat/session/:sessionId', () => {
    it('should return session metadata', async () => {
      // First create a session
      const createResponse = await request(app.getHttpServer())
        .post('/chat/message')
        .set('Authorization', validToken)
        .send({
          message: 'Hello',
        })
        .expect(200);

      const sessionId = createResponse.body.session_id;

      // Get session metadata
      const response = await request(app.getHttpServer())
        .get(`/chat/session/${sessionId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(sessionId);
      expect(response.body.created_at).toBeDefined();
      expect(response.body.updated_at).toBeDefined();
      expect(response.body.message_count).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get(`/chat/session/${uuidv4()}`)
        .set('Authorization', validToken)
        .expect(404);
    });
  });
});
