import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import {outputJson, pathExists, readFile, readJson} from 'fs-extra'
import got from 'got/dist/source'
import * as notifier from 'node-notifier'
import {resolve} from 'path'

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
    agent1: flags.string({description: 'id of agent 1'}),
    agent2: flags.string({description: 'id of agent 2'}),
    code: flags.string({char: 'c', description: 'path to your bot source code'}),
    config: flags.string({description: 'path to config file', default: './cgconfig.json'}),
    language: flags.string({char: 'l', description: 'programming language of your bot source code', options: ['C#']}),
    outdir: flags.string({description: 'directory in which to place the output data from simulation runs, created if doesn\'t exist', dependsOn: ['output']}),
    output: flags.boolean({char: 'o', description: 'whether or not to output simulation data to file', default: false}),
    puzzle: flags.string({char: 'p', description: 'name of puzzle or contest used by CodinGame API'}),
  }

  static args = [{name: 'count', description: 'the number of simulations to run on the server. Must be bigger than 0', default: 1}]

  async run() {
    const {args, flags}: { args: RunCommandArgs; flags: RunCommandFlags} = this.parse(Run)

    const config = await this.getConfig(flags.config)

    this.validateInputs(flags, config, args)
    const outdir = resolve(flags.outdir ?? config.outputDir ?? './cg-out')
    const puzzleName = flags.puzzle ?? config.puzzleName!
    const codePath = flags.code ?? config.codePath!
    const programmingLanguageId = flags.language ?? config.programmingLanguageId!
    const agent1Id = Number(flags.agent1) || config.agent1!
    const agent2Id = Number(flags.agent2) || config.agent2!

    const testSessionId = await this.getSessionId(config.cookie, config.userId, puzzleName)
    const code = await this.getCode(codePath)

    const payload: TestSessionPayload = {cookie: config.cookie, testSessionId, code, programmingLanguageId, agent1Id, agent2Id}
    const gameDataIterator = this.generateGameData(payload, args.count)
    await this.processGameData(gameDataIterator, flags.output, outdir)

    notifier.notify({title: 'cg-cli', message: 'Your command has finished running.'})
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
    if (args.count < 1) {
      this.error(`The count argument must be bigger than 0 and it was ${args.count}`, {exit: 1})
    }

    if (!config.cookie) {
      this.error('No cookie was specified. Please add \'cookie\' property to config file', {exit: 1})
    }

    if (!config.cookie.includes('rememberMe=')) {
      this.error(`Cookie '${config.cookie}' is invalid. Cookie must start with 'rememberMe=`, {exit: 1})
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
      this.error('No id for agent 2 was specified. Please add \'agent1\' property to config file or use --agent1 flag.', {exit: 1})
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
    const code = (await readFile(resolve(codePath), 'utf8')).trim()
    cli.action.stop()
    return code
  }

  private async * generateGameData(payload: TestSessionPayload, count: number) {
    this.log('Running simulations...')
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
      const response: TestSessionPlayData = await this.getTestSessionPlayData(payload) // eslint-disable-line no-await-in-loop

      // 2 = win, 1 = loss, 0 = DNF
      agent1Wins += Math.max(response.scores[0] - 1, 0)
      agent2Wins += Math.max(response.scores[1] - 1, 0)

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

  private async getTestSessionPlayData(payload: TestSessionPayload): Promise<TestSessionPlayData> {
    try {
      const response = await got.post<TestSessionPlayData>('https://www.codingame.com/services/TestSession/play', {
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
      this.log()
      this.error(`There was a problem running your simulations. ${message}`, {exit: 1})
    }
  }

  private async processGameData(gameDataIterator: AsyncGenerator<TestSessionPlayData, void, unknown>, output: boolean, outdir: string) {
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

    if (writeOperations.length > 0) {
      cli.action.start('Writing simulation data')
      await Promise.all(writeOperations)
      cli.action.stop()
    }
  }
}

interface RunCommandArgs {
  count: number;
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
}

interface CGConfig {
  cookie: string;
  userId: number;
  puzzleName?: string;
  codePath?: string;
  programmingLanguageId?: string;
  agent1: number;
  agent2: number;
  outputDir?: string;
}

interface TestSessionPlayData {
  frames: FrameData[];
  gameId: number;
  refereeInput: string;
  scores: [number, number];
  ranks: [number, number];
}

interface FrameData {
  gameInformation: string;
  summary?: string;
  view: string;
  keyframe: boolean;
  agentId: -1 | 0 | 1;
  stdout?: string;
  stderr?: string;
}

interface TestSessionPayload {
  cookie: string;
  testSessionId: string;
  code: string;
  programmingLanguageId: string;
  agent1Id: number;
  agent2Id: number;
}
