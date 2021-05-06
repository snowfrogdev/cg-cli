import {cli} from 'cli-ux'
import {TestSessionPlayResponse, User} from '../abstractions'
import {ThrottlingError} from '../errors/throttling.error'
import {CodinGameApiService} from './codingame-api.service'

export class GameDataGeneratorService {
  private readonly startingTimeOut = 10000;

  private lastTimeOut = 5000;

  constructor(private apiService: CodinGameApiService, private options: GameDataGeneratorOptions) {} // eslint-disable-line no-useless-constructor

  public async * generateGameData(count: number) {
    const agent2Name = this.options.agent2[0].pseudo
    const agent2Id = this.options.agent2[0].agentId
    const progress = cli.progress({
      format: `{bar}\u25A0 ETA: {eta}s | {value}/{total} | Agent1: {agent1Wins} wins ({agent1Percentage}) | ${agent2Name} (${agent2Id}): {agent2Wins} wins ({agent2Percentage}) | Margin of Error: {marginOfError}`,
      barCompleteChar: '\u25A0',
      barIncompleteChar: ' ',
    })
    progress.start(count, 0, {agent1Wins: 0, agent2Wins: 0, agent1Percentage: 'N/A', agent2Percentage: 'N/A', marginOfError: 'N/A'})

    const percentage = new Intl.NumberFormat('en-US', {style: 'percent'})
    let agent1Wins = 0
    let agent2Wins = 0

    for (let i = 0; i < count; i++) {
      progress.update(i)

      const response: TestSessionPlayResponse = await this.getPlayData(this.options.agent2[0].agentId) // eslint-disable-line no-await-in-loop

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

  public async * generateGameDataMulti() {
    const users = this.options.agent2
    const count = users.length

    const percentage = new Intl.NumberFormat('en-US', {style: 'percent'})
    let agent1Wins = 0

    for (let i = 0; i < count; i++) {
      cli.action.start(`Playing match ${i + 1} of ${count} against ${users[i].pseudo} | ${users[i].agentId}`)
      const response: TestSessionPlayResponse = await this.getPlayData(users[i].agentId) // eslint-disable-line no-await-in-loop
      this.lastTimeOut = this.startingTimeOut

      const agent1HasWon: boolean = response.ranks[0] === 0
      agent1Wins += agent1HasWon ? 1 : 0

      const agent1Percentage = agent1Wins / (i + 1)

      const marginOfError = 1 / Math.sqrt(i + 1)

      cli.action.stop(`${agent1HasWon ? 'WIN' : 'LOSS'} | Wins: ${agent1Wins} (${percentage.format(agent1Percentage)}) | Margin of Error: ${percentage.format(marginOfError)}`)
      yield response
    }
  }

  private async getPlayData(agentId: number): Promise<TestSessionPlayResponse> {
    try {
      return await this.apiService.getTestSessionPlayData({...this.options, agent2Id: agentId})
    } catch (error) {
      if (error instanceof ThrottlingError) {
        this.lastTimeOut = this.lastTimeOut * 2
        cli.action.start(`Reached limit, waiting for ${this.lastTimeOut / 1000}s`)
        await cli.wait(this.lastTimeOut)
        cli.action.stop('Retrying')
        return this.getPlayData(agentId)
      }
      throw error
    }
  }
}

export interface GameDataGeneratorOptions {
  cookie: string;
  code: string;
  programmingLanguageId: string;
  agent1Id: number;
  agent2: User[];
  gameOptions: string | null;
}
