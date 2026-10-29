import { Test, TestingModule } from '@nestjs/testing';
import { PersonaDetector, PersonaDetectionResult } from './persona-detector';
import { BuyerPersona } from './dto/chat-response.dto';

describe('PersonaDetector', () => {
  let detector: PersonaDetector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonaDetector],
    }).compile();

    detector = module.get<PersonaDetector>(PersonaDetector);
  });

  it('should be defined', () => {
    expect(detector).toBeDefined();
  });

  describe('detectPersona', () => {
    it('should detect RESEARCHER persona from research-focused message', () => {
      const message = 'How does this property compare to others? Can you explain the specifications?';
      const result = detector.detectPersona(message);

      expect(result).toBeDefined();
      expect(result.persona_type).toBe(BuyerPersona.RESEARCHER);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.characteristics).toBeDefined();
      expect(result.characteristics.length).toBeGreaterThan(0);
    });

    it('should detect EARLY_ADOPTER persona from innovation-focused message', () => {
      const message = 'What are the latest features? I want to try the newest technology available.';
      const result = detector.detectPersona(message);

      expect(result.persona_type).toBe(BuyerPersona.EARLY_ADOPTER);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect DECISION_MAKER persona from business-focused message', () => {
      const message = 'What is the ROI? We need to get approval from the board on the implementation timeline and budget.';
      const result = detector.detectPersona(message);

      expect(result.persona_type).toBe(BuyerPersona.DECISION_MAKER);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect LATE_ADOPTER persona from stability-focused message', () => {
      const message = 'Is this proven and stable? I need a reliable solution with good support.';
      const result = detector.detectPersona(message);

      expect(result.persona_type).toBe(BuyerPersona.LATE_ADOPTER);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect SKEPTIC persona from problem-focused message', () => {
      const message = "This doesn't seem to work. I have an issue with the system failing.";
      const result = detector.detectPersona(message);

      expect(result.persona_type).toBe(BuyerPersona.SKEPTIC);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return confidence score between 0 and 1', () => {
      const message = 'How much does this cost?';
      const result = detector.detectPersona(message);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include relevant characteristics for detected persona', () => {
      const message = 'How does this property compare to other options? Can you explain the details?';
      const result = detector.detectPersona(message);

      expect(Array.isArray(result.characteristics)).toBe(true);
      expect(result.characteristics.length).toBeGreaterThan(0);
    });

    it('should detect persona from conversation history context', () => {
      const message = 'Can you provide more analysis?';
      const history = [
        { message: 'What are the specifications?', response: '...' },
        { message: 'How does it compare to competitors?', response: '...' },
      ];

      const result = detector.detectPersona(message, history);

      expect(result).toBeDefined();
      expect(result.persona_type).toBeDefined();
    });

    it('should handle short messages gracefully', () => {
      const message = 'Hi';
      const result = detector.detectPersona(message);

      expect(result).toBeDefined();
      expect(result.persona_type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty history array', () => {
      const message = 'What is this?';
      const result = detector.detectPersona(message, []);

      expect(result).toBeDefined();
      expect(result.persona_type).toBeDefined();
    });

    it('should be case-insensitive', () => {
      const result1 = detector.detectPersona('How does this work?');
      const result2 = detector.detectPersona('HOW DOES THIS WORK?');

      expect(result1.persona_type).toBe(result2.persona_type);
    });
  });
});
