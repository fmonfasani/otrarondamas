import { Injectable, Logger } from '@nestjs/common';
import { BuyerPersona } from './dto/chat-response.dto';

export interface PersonaDetectionResult {
  persona_type: BuyerPersona;
  confidence: number;
  characteristics: string[];
}

@Injectable()
export class PersonaDetector {
  private readonly logger = new Logger(PersonaDetector.name);

  /**
   * Detect buyer persona from message content and conversation history.
   * Analyzes language patterns, intent, and context to classify the user.
   */
  detectPersona(
    message: string,
    history: Array<{ message: string; response: string }> = [],
  ): PersonaDetectionResult {
    const lowerMessage = message.toLowerCase();
    const fullContext = [message, ...history.map((h) => h.message)].join(' ').toLowerCase();

    // Keywords and patterns for each persona
    const personas: Record<BuyerPersona, { keywords: string[]; weight: number }> = {
      [BuyerPersona.RESEARCHER]: {
        keywords: [
          'how does',
          'what is',
          'explain',
          'research',
          'compare',
          'analysis',
          'detailed',
          'spec',
          'documentation',
          'learn',
          'understand',
        ],
        weight: 0,
      },
      [BuyerPersona.EARLY_ADOPTER]: {
        keywords: [
          'new',
          'latest',
          'cutting edge',
          'innovation',
          'beta',
          'first',
          'early access',
          'try',
          'experimental',
          'pioneer',
        ],
        weight: 0,
      },
      [BuyerPersona.DECISION_MAKER]: {
        keywords: [
          'roi',
          'investment',
          'cost',
          'pricing',
          'business case',
          'approval',
          'budget',
          'implementation',
          'timeline',
          'team',
          'meeting',
          'board',
        ],
        weight: 0,
      },
      [BuyerPersona.LATE_ADOPTER]: {
        keywords: [
          'proven',
          'mature',
          'stable',
          'reliable',
          'support',
          'warranty',
          'established',
          'safe',
          'best practice',
          'tried',
        ],
        weight: 0,
      },
      [BuyerPersona.SKEPTIC]: {
        keywords: [
          "doesn't work",
          'issue',
          'problem',
          'complaint',
          'broken',
          "doesn't",
          'fail',
          'error',
          'bug',
          'not working',
        ],
        weight: 0,
      },
    };

    // Score each persona based on keyword presence
    for (const [persona, { keywords }] of Object.entries(personas)) {
      let score = 0;
      for (const keyword of keywords) {
        if (fullContext.includes(keyword)) {
          score++;
        }
      }
      personas[persona as BuyerPersona].weight = score;
    }

    // Find the highest scoring persona
    const sorted = Object.entries(personas).sort(([, a], [, b]) => b.weight - a.weight);
    const [topPersona, { weight: topWeight }] = sorted[0];
    const totalKeywords = Object.values(personas).reduce((sum, p) => sum + p.weight, 0);

    // Calculate confidence (0-1 range)
    const confidence = totalKeywords > 0 ? Math.min(topWeight / totalKeywords, 1) : 0.5;

    // Determine characteristics based on persona
    const characteristics = this.getCharacteristics(topPersona as BuyerPersona);

    this.logger.debug(
      `Persona detected: ${topPersona} (confidence: ${confidence.toFixed(2)}) from message: "${message.substring(0, 50)}..."`,
    );

    return {
      persona_type: topPersona as BuyerPersona,
      confidence: confidence < 0.3 ? 0.5 : confidence, // Default to 0.5 if too low confidence
      characteristics,
    };
  }

  private getCharacteristics(persona: BuyerPersona): string[] {
    const characteristicMap: Record<BuyerPersona, string[]> = {
      [BuyerPersona.RESEARCHER]: [
        'Information-seeking',
        'Analytical',
        'Detail-oriented',
        'Long decision cycle',
      ],
      [BuyerPersona.EARLY_ADOPTER]: [
        'Innovation-focused',
        'Risk-tolerant',
        'Quick decision-maker',
        'Trend-setter',
      ],
      [BuyerPersona.DECISION_MAKER]: [
        'Business-focused',
        'Budget-conscious',
        'Timeline-aware',
        'Impact-focused',
      ],
      [BuyerPersona.LATE_ADOPTER]: [
        'Risk-averse',
        'Stability-seeking',
        'Proven-solution focused',
        'Support-dependent',
      ],
      [BuyerPersona.SKEPTIC]: [
        'Problem-focused',
        'Critical thinker',
        'Issue-oriented',
        'Cautious',
      ],
      [BuyerPersona.UNKNOWN]: ['Not enough data', 'Context insufficient'],
    };

    return characteristicMap[persona] || characteristicMap[BuyerPersona.UNKNOWN];
  }
}
