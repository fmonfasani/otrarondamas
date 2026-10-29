import { ApiProperty } from '@nestjs/swagger';

export enum BuyerPersona {
  RESEARCHER = 'RESEARCHER',
  EARLY_ADOPTER = 'EARLY_ADOPTER',
  DECISION_MAKER = 'DECISION_MAKER',
  LATE_ADOPTER = 'LATE_ADOPTER',
  SKEPTIC = 'SKEPTIC',
  UNKNOWN = 'UNKNOWN',
}

export class PersonaMetadata {
  @ApiProperty({ enum: BuyerPersona })
  persona_type: BuyerPersona;

  @ApiProperty({ type: Number, minimum: 0, maximum: 1 })
  confidence: number;

  @ApiProperty({ type: [String] })
  characteristics: string[];
}

export class ChatMessageResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  session_id: string;

  @ApiProperty()
  response: string;

  @ApiProperty()
  user_message: string;

  @ApiProperty(() => PersonaMetadata)
  persona: PersonaMetadata;

  @ApiProperty({
    description: 'Additional metadata about the response',
    type: Object,
  })
  metadata: {
    model: string;
    tokens_used?: number;
    response_time_ms: number;
  };

  @ApiProperty()
  created_at: Date;
}

export class ChatHistoryItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  response: string;

  @ApiProperty(() => PersonaMetadata)
  persona: PersonaMetadata;

  @ApiProperty()
  created_at: Date;
}

export class ChatHistoryResponse {
  @ApiProperty({ type: [ChatHistoryItem] })
  messages: ChatHistoryItem[];

  @ApiProperty()
  session_id: string;

  @ApiProperty()
  total_count: number;
}

export class SessionDeleteResponse {
  @ApiProperty()
  message: string;

  @ApiProperty()
  session_id: string;

  @ApiProperty()
  deleted_at: Date;
}
