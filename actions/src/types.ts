export interface IRecord {
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
