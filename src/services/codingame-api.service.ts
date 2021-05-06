import got from 'got'
import {GetFilteredArenaDivisionRoomLeaderboardResponse, StartTestSessionResponse, TestSessionPlayOptions, TestSessionPlayResponse, UserResponse} from '../abstractions'
import {ThrottlingError} from '../errors/throttling.error'

/* eslint-disable no-useless-constructor */
export class CodinGameApiService {
  private static readonly baseUrl = 'https://www.codingame.com/services'

  private constructor(
    private readonly cookie: string,
    private readonly testSessionId: string,
    private readonly publicHandle: string,
    private readonly divisionId: number,
    private readonly roomIndex: number,
    private readonly agentId: number
  ) { }

  static async build(cookie: string, userId: number, puzzleName: string): Promise<CodinGameApiService> {
    const testSessionId = await this.getSessionId(cookie, userId, puzzleName)
    const {publicHandle, agentId} = await this.getPublicHandleAndAgentId(cookie, testSessionId)
    const {divisionId, roomIndex} = await this.getDivisionIdAndRoomIndex(cookie, testSessionId)
    return new CodinGameApiService(cookie, testSessionId, publicHandle, divisionId, roomIndex, agentId)
  }

  private static async getSessionId(cookie: string, userId: number, puzzleName: string): Promise<string> {
    try {
      const response = await got.post<{ reportReady: boolean; handle: string; direct: boolean }>(`${this.baseUrl}/Puzzle/generateSessionFromPuzzlePrettyId`, {
        headers: {
          cookie,
        },
        json: [userId, puzzleName, false],
        responseType: 'json',
      })
      return response.body.handle
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem fetching a Test Session handle from CodinGame for puzzle ${puzzleName}. ${message}`)
    }
  }

  private static async getPublicHandleAndAgentId(cookie: string, testSessionId: string): Promise<{publicHandle: string; agentId: number}> {
    try {
      const response = await got.post<UserResponse>(`${CodinGameApiService.baseUrl}/Leaderboards/getUserArenaDivisionRoomRankingByTestSessionHandle`, {
        headers: {
          cookie,
        },
        json: [testSessionId, 'global'],
        responseType: 'json',
      })
      return {publicHandle: response.body?.codingamer?.publicHandle!, agentId: response.body?.agentId!}
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem fetching your public handle from CodinGame. ${message}`)
    }
  }

  private static async getDivisionIdAndRoomIndex(cookie: string, testSessionId: string): Promise<{ divisionId: number; roomIndex: number }> {
    try {
      const response = await got.post<StartTestSessionResponse>(`${CodinGameApiService.baseUrl}/TestSession/startTestSession`, {
        headers: {
          cookie,
        },
        json: [testSessionId],
        responseType: 'json',
      })
      const {divisionId, roomIndex} = response.body.currentQuestion.arena.arenaCodinGamer
      return {divisionId, roomIndex}
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem fetching division id and room index from CodinGame. ${message}`)
    }
  }

  async getFilteredArenaDivisionRoomLeaderboard(options?: GetFilteredArenaDivisionRoomLeaderboardOptions): Promise<GetFilteredArenaDivisionRoomLeaderboardResponse> {
    try {
      const response = await got.post<GetFilteredArenaDivisionRoomLeaderboardResponse>(`${CodinGameApiService.baseUrl}/Leaderboards/getFilteredArenaDivisionRoomLeaderboard`, {
        headers: {
          cookie: this.cookie,
        },
        json: [{divisionId: this.divisionId, roomIndex: this.roomIndex}, this.publicHandle, null, {active: options?.active, column: options?.column ?? 'CODINGAMER', filter: options?.filter ?? 'ALL'}],
        responseType: 'json',
      })
      return response.body
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem fetching user(s) from CodinGame. ${message}`)
    }
  }

  async getTestSessionPlayData(options: TestSessionPlayOptions): Promise<TestSessionPlayResponse> {
    try {
      const response = await got.post<TestSessionPlayResponse>(`${CodinGameApiService.baseUrl}/TestSession/play`, {
        headers: {
          cookie: this.cookie,
        },
        json: [
          this.testSessionId,
          {
            code: options.code,
            programmingLanguageId: options.programmingLanguageId,
            multi: {
              agentsIds: [options.agent1Id, options.agent2Id],
              gameOptions: options.gameOptions,
            },
          },
        ],
        responseType: 'json',
      })
      return response.body
    } catch (error) {
      if (error?.response?.body?.id === 407) {
        throw new ThrottlingError(error.response.body.message)
      }
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem running your simulations. ${message}`)
    }
  }
}

export interface GetFilteredArenaDivisionRoomLeaderboardOptions {
  active: boolean;
  column: LeaderBoardFilterColumn;
  filter: LeaderBoardCountryFilterOption | LeaderBoardScoreFilterOption | LeaderBoardCodinGamerFilterOption | LeaderBoardLanguageFilterOption | string;
}

type LeaderBoardFilterColumn = 'CODINGAMER' | 'LANGUAGE' | 'SCORE' | 'COUNTRY' | 'KEYWORD'

type LeaderBoardCountryFilterOption = 'ALL' | 'SAME'

type LeaderBoardScoreFilterOption = 'ALL' | 'FINISHED' | 'INPROGRESS'

type LeaderBoardCodinGamerFilterOption = 'ALL' | 'AROUND' | 'FOLLOWING' | 'ONLINE'

type LeaderBoardLanguageFilterOption =
  'SAME' |
  'ALL' |
  'Bash' |
  'C' |
  'C#' |
  'C++' |
  'Clojure' |
  'D' |
  'Dart' |
  'F#' |
  'Go' |
  'Groovy' |
  'Haskell' |
  'Java' |
  'Javascript' |
  'Kotlin' |
  'Lua' |
  'ObjectiveC' |
  'OCaml' |
  'Pascal' |
  'Perl' |
  'PHP' |
  'Python3' |
  'Ruby' |
  'Rust' |
  'Scala' |
  'Swift' |
  'TypeScript' |
  'VB.NET'
