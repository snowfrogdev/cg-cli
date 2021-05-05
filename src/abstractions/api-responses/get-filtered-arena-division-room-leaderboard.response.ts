import {UserResponse} from './user.response'

export interface GetFilteredArenaDivisionRoomLeaderboardResponse {
  users?: UserResponse[];
  count?: number;
  filteredCount?: number;
  programminLanguages?: {
    [language: string]: number;
  };
  leagues?: {};
  codingamerUserRank?: UserResponse;
  customFormValueCounters?: {};
}
