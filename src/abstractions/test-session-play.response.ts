export interface TestSessionPlayResponse {
  frames: FrameData[];
  gameId: number;
  refereeInput: string;
  scores: [number, number];
  ranks: [number, number];
}

export interface FrameData {
  gameInformation: string;
  summary?: string;
  view: string;
  keyframe: boolean;
  agentId: -1 | 0 | 1;
  stdout?: string;
  stderr?: string;
}
