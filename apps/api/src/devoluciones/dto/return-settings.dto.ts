import { IsInt, Max, Min } from 'class-validator';

/* eslint-disable indent */

/** OR-B4-035 rule 4 — the Business's return window, in days after the sale. */
export class ReturnSettingsDto {
  @IsInt()
  @Min(1)
  @Max(365)
  plazoDias: number;
}
