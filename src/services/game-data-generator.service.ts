import {cli} from 'cli-ux'
import got from 'got'
import {TestSessionPayload, TestSessionPlayResponse} from '../abstractions'

export class GameDataGeneratorService {
  constructor(private payload: TestSessionPayload) {} // eslint-disable-line no-useless-constructor

  public async * generateGameData(count: number) {
    const progress = cli.progress({
      format: ' {bar}\u25A0 ETA: {eta}s | {value}/{total} | Agent1: {agent1Wins} wins ({agent1Percentage}) | Agent2: {agent2Wins} wins ({agent2Percentage}) | Margin of Error: {marginOfError}',
      barCompleteChar: '\u25A0',
      barIncompleteChar: ' ',
    })
    progress.start(count, 0, {agent1Wins: 0, agent2Wins: 0, agent1Percentage: 'N/A', agent2Percentage: 'N/A', marginOfError: 'N/A'})

    const percentage = new Intl.NumberFormat('en-US', {style: 'percent'})
    let agent1Wins = 0
    let agent2Wins = 0

    for (let i = 0; i < count; i++) {
      progress.update(i)
      const response: TestSessionPlayResponse = await this.getTestSessionPlayData(this.payload) // eslint-disable-line no-await-in-loop

      agent1Wins += response.ranks[0] === 0 ? 1 : 0
      agent2Wins += response.ranks[0] === 1 ? 1 : 0

      const agent1Percentage = agent1Wins / (i + 1)
      const agent2Percentage = agent2Wins / (i + 1)

      const marginOfError = 1 / Math.sqrt(i + 1)

      progress.update({
        agent1Wins,
        agent2Wins,
        agent1Percentage: percentage.format(agent1Percentage),
        agent2Percentage: percentage.format(agent2Percentage),
        marginOfError: percentage.format(marginOfError),
      })

      yield response
    }

    progress.increment(1)
    progress.stop()
  }

  public async * generateGameDataMulti(top10AgentIds: number[]) {
    const count = top10AgentIds.length

    const percentage = new Intl.NumberFormat('en-US', {style: 'percent'})
    let agent1Wins = 0

    for (let i = 0; i < count; i++) {
      cli.action.start(`Playing match ${i + 1} of ${count} against ${top10AgentIds[i]}`)
      const response: TestSessionPlayResponse = await this.getTestSessionPlayData({...this.payload, agent2Id: top10AgentIds[i]}) // eslint-disable-line no-await-in-loop

      const agent1HasWon: boolean = response.ranks[0] === 0
      agent1Wins += agent1HasWon ? 1 : 0

      const agent1Percentage = agent1Wins / (i + 1)

      const marginOfError = 1 / Math.sqrt(i + 1)

      cli.action.stop(`${agent1HasWon ? 'WIN' : 'LOSS'} | Wins: ${agent1Wins} (${percentage.format(agent1Percentage)}) | Margin of Error: ${percentage.format(marginOfError)}`)
      yield response
    }
  }

  private async getTestSessionPlayData(payload: TestSessionPayload): Promise<TestSessionPlayResponse> {
    try {
      const response = await got.post<TestSessionPlayResponse>('https://www.codingame.com/services/TestSession/play', {
        headers: {
          cookie: payload.cookie,
        },
        json: [
          payload.testSessionId,
          {
            code: payload.code,
            programmingLanguageId: payload.programmingLanguageId,
            multi: {
              agentsIds: [payload.agent1Id, payload.agent2Id],
              gameOptions: null,
            },
          },
        ],
        responseType: 'json',
      })
      return response.body
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      throw new Error(`There was a problem running your simulations. ${message}`)
    }
  }
}

