export interface IRecord {
  filename: string;
  day: number;
  round: number;
  rank: IRank[];
}

export interface IRank {
  name: string;

  /**
   * Raw score
   */
  score: number;

  /**
   * 10 x Pt
   */
  pt: number;
}

export type Summary = Array<{ name: string; round: number; pt: number }>;
