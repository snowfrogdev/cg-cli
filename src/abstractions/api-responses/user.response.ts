export interface UserResponse {
  pseudo?: string;
  rank?: number;
  localRank?: number;
  score?: number;
  testSessionHandle?: string;
  league?: {
    divisionIndex?: number;
    divisionCount?: number;
    openingLeaguesCount?: number;
    divisionOffset?: number;
  };
  arenaboss?: {
    nickname?: string;
    league?: {
    divisionIndex?: number;
    divisionCount?: number;
    openingLeaguesCount?: number;
    divisionOffset?: number;
    };
  };
  eligibleForPromotion?: boolean;
  programmingLanguage?: string;
  progress?: string;
  updateTime?: number;
  creationTime?: number;
  percentage?: number;
  agentId?: number;
  inProgress?: boolean;
  codingamer?: {
    userId?: number;
    pseudo?: string;
    countryId?: string;
    publicHandle?: string;
    avatar?: number;
    level?: number;
    category?: string;
  };
  percentageNoCache?: number;
}
