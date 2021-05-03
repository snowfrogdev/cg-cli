export interface GetCompatibleAgentsLeaderboardResponse {
  users: User[];
}

export interface User {
  pseudo: string;
  score: number;
  league: {
    divisionIndex: number;
    divisionCount: number;
    openingLeaguesCount: number;
    divisionOffset: number;
  };
  arenaboss?: {
    nickname: string;
    league: {
    divisionIndex: number;
    divisionCount: number;
    openingLeaguesCount: number;
    divisionOffset: number;
    };
  };
  programmingLanguage: string;
  progress: string;
  updateTime: number;
  creationTime: number;
  percentage: number;
  agentId: number;
  inProgress: boolean;
}
