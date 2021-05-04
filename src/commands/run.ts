import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import {outputJson, pathExists, readFile, readJson} from 'fs-extra'
import got from 'got'
import * as notifier from 'node-notifier'
import {resolve} from 'path'
import {CGConfig, GetCompatibleAgentsLeaderboardResponse, StartTestSessionResponse, TestSessionPayload, TestSessionPlayResponse, User} from '../abstractions'
import {programmingLanguageChoices} from '../constants/programming-language-choices'
import {GameDataGeneratorService} from '../services/game-data-generator.service'

export class Run extends Command {
  static description = 'run test session playouts between two bots'

  static examples = [
    `$ cg run 10 -o
Reading config file... done
Validating inputs... done
Fetching test session id from CodinGame... done
Grabbing source code... done
Running simulations...
 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ ETA: 0s | 10/10 | Agent1: 5 wins (50%) | Agent2: 5 wins (50%) | Margin of Error: 32%
Writing simulation data... done`,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    agent1: flags.string({description: 'id of agent 1, a value of -1 means your own code, a value of -2 means the boss for the league'}),
    agent2: flags.string({description: 'id of agent 2, a value of -1 means your own code, a value of -2 means the boss for the league'}),
    code: flags.string({char: 'c', description: 'path to the file containing the code to be submitted to CodinGame'}),
    config: flags.string({description: 'path to config file', default: './cgconfig.json'}),
    language: flags.string({char: 'l', description: 'programming language of your bot source code', options: programmingLanguageChoices}),
    outdir: flags.string({description: 'directory in which to place the output data from simulation runs, created if doesn\'t exist', dependsOn: ['output']}),
    output: flags.boolean({char: 'o', description: 'whether or not to output simulation data to file', default: false}),
    puzzle: flags.string({char: 'p', description: 'name of puzzle or contest used by CodinGame API'}),
    top10: flags.boolean({description: 'play agent1 against the top 10 bots in the league', default: false, exclusive: ['agent2']}),
  }

  static args = [{name: 'count', description: 'the number of simulations to run on the server. Must be bigger than 0', default: 1}]

  async run() {
    const {args, flags}: { args: RunCommandArgs; flags: RunCommandFlags } = this.parse(Run)

    const config = await this.getConfig(flags.config)

    this.validateInputs(flags, config, args)
    const cookie = `rememberMe=${config.cookie}`
    const outdir = resolve(flags.outdir ?? config.outputDir ?? './cg-out')
    const puzzleName = flags.puzzle ?? config.puzzleName!
    const codePath = flags.code ?? config.codePath!
    const programmingLanguageId = flags.language ?? config.programmingLanguageId!
    const agent1Id = Number(flags.agent1) || config.agent1!
    const agent2Id = Number(flags.agent2) || config.agent2!
    const count = Number(args.count)

    const testSessionId = await this.getSessionId(cookie, config.userId!, puzzleName)
    const code = await this.getCode(codePath)

    const payload: TestSessionPayload = {cookie, testSessionId, code, programmingLanguageId, agent1Id, agent2Id}
    const gameDataIterator = await this.getGameDataIterator(payload, count, flags.top10)

    await this.processGameData(gameDataIterator, flags.output, outdir)

    notifier.notify({title: 'cg-cli', message: 'Your command has finished running.'})
  }

  private async getGameDataIterator(payload: TestSessionPayload, count: number, top10 = false) {
    this.log('Running simulations...')
    const gameDataGeneratorService = new GameDataGeneratorService(payload)
    let gameDataIterator: AsyncGenerator<TestSessionPlayResponse>
    if (top10) {
      const top10AgentIds = await this.getTop10UserIds(payload.cookie, payload.testSessionId)
      gameDataIterator = gameDataGeneratorService.generateGameDataMulti(top10AgentIds)
    } else {
      gameDataIterator = gameDataGeneratorService.generateGameData(count)
    }
    return gameDataIterator
  }

  private async getConfig(configPath: string) {
    cli.action.start('Reading config file')
    if (!await pathExists(resolve(configPath))) {
      this.error(`Could not find valid config file at ${resolve(configPath)}`, {exit: 1})
    }
    const config = await readJson(resolve(configPath)) as CGConfig
    cli.action.stop()
    return config
  }

  private validateInputs(flags: RunCommandFlags, config: CGConfig, args: RunCommandArgs) {
    cli.action.start('Validating inputs')
    const count = Number(args.count)
    if (isNaN(count) || count < 1) {
      this.error(`The count argument must be a number bigger than 0 and it was ${args.count}`, {exit: 1})
    }

    if (!config.cookie) {
      this.error('No cookie was specified. Please add \'cookie\' property to config file', {exit: 1})
    }

    if (!config.userId) {
      this.error('No user id was specified. Please add \'userId\' property to config file', {exit: 1})
    }

    if (!flags.language && !config.programmingLanguageId) {
      this.error('No programming language was specified. Please add \'programmingLanguageId\' property to config file or use --language flag.', {exit: 1})
    }

    if (!flags.agent1 && !config.agent1) {
      this.error('No id for agent 1 was specified. Please add \'agent1\' property to config file or use --agent1 flag.', {exit: 1})
    }

    if (!flags.agent2 && !config.agent2) {
      this.error('No id for agent 2 was specified. Please add \'agent2\' property to config file or use --agent2 flag.', {exit: 1})
    }

    if (!flags.puzzle && !config.puzzleName) {
      this.error('No puzzle name was specified. Please add \'puzzleName\' property to config file or use --puzzle flag.', {exit: 1})
    }

    if (!flags.code && !config.codePath) {
      this.error('No code path was specified. Please add \'codePath\' property to config file or use --code flag.', {exit: 1})
    }
    cli.action.stop()
  }

  private async getSessionId(cookie: string, userId: number, puzzleName: string): Promise<string> {
    cli.action.start('Fetching test session id from CodinGame')
    try {
      const response = await got.post<{ reportReady: boolean; handle: string; direct: boolean }>('https://www.codingame.com/services/Puzzle/generateSessionFromPuzzlePrettyId', {
        headers: {
          cookie,
        },
        json: [userId, puzzleName, false],
        responseType: 'json',
      })
      cli.action.stop()
      return response.body.handle
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      this.log()
      this.error(`There was a problem fetching a Test Session handle from CodinGame for puzzle ${puzzleName}. ${message}`, {exit: 1})
    }
  }

  private async getCode(codePath: string) {
    cli.action.start('Grabbing source code')
    try {
      const code = (await readFile(resolve(codePath), 'utf8')).trim()
      cli.action.stop()
      return code
    } catch (error) {
      this.error(`There was a problem trying to read your code from ${codePath}. ${error.message}`, {exit: 1})
    }
  }

  private async getTop10UserIds(cookie: string, testSessionId: string): Promise<number[]> {
    const {divisionId, roomIndex} = await this.getDivisionIdAndRoomIndex(cookie, testSessionId)
    const users = await this.getUsers(cookie, divisionId, roomIndex, testSessionId)
    return users.slice(0, 10).map(user => user.agentId)
  }

  private async getDivisionIdAndRoomIndex(cookie: string, testSessionId: string): Promise<{ divisionId: number; roomIndex: number }> {
    cli.action.start('Fetching division id and room index from CodinGame')
    try {
      const response = await got.post<StartTestSessionResponse>('https://www.codingame.com/services/TestSession/startTestSession', {
        headers: {
          cookie,
        },
        json: [testSessionId],
        responseType: 'json',
      })
      const {divisionId, roomIndex} = response.body.currentQuestion.arena.arenaCodinGamer
      cli.action.stop()
      return {divisionId, roomIndex}
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      this.log()
      this.error(`There was a problem fetching division id and room index from CodinGame. ${message}`, {exit: 1})
    }
  }

  private async getUsers(cookie: string, divisionId: number, roomIndex: number, testSessionId: string): Promise<User[]> {
    cli.action.start('Fetching compatible users from CodinGame')
    try {
      const response = await got.post<GetCompatibleAgentsLeaderboardResponse>('https://www.codingame.com/services/Leaderboards/getCompatibleAgentsLeaderboard', {
        headers: {
          cookie,
        },
        json: [{divisionId, roomIndex}, testSessionId],
        responseType: 'json',
      })
      cli.action.stop()
      return response.body.users
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      this.log()
      this.error(`There was a problem fetching compatible users from CodinGame. ${message}`, {exit: 1})
    }
  }

  private async processGameData(gameDataIterator: AsyncGenerator<TestSessionPlayResponse, void, unknown>, output: boolean, outdir: string) {
    const writeOperations: Promise<void>[] = []
    const date = new Date()
    const dateStamp = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
    let i = 1
    for await (const gameData of gameDataIterator) {
      if (output) {
        const path = outdir + `/${dateStamp}-${i}.json`
        writeOperations.push(outputJson(path, gameData))
      }
      i++
    }
    this.log('Simulations done.')

    if (writeOperations.length > 0) {
      cli.action.start('Writing simulation data')
      await Promise.all(writeOperations)
      cli.action.stop()
    }
  }
}

interface RunCommandArgs {
  count: string;
}

interface RunCommandFlags {
    help: void;
    agent1: string | undefined;
    agent2: string | undefined;
    code: string | undefined;
    config: string;
    language: string | undefined;
    outdir: string | undefined;
    output: boolean;
  puzzle: string | undefined;
  top10: boolean;
}

