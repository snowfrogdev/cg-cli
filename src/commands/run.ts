import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import {outputJson, pathExists, readFile, readJson} from 'fs-extra'
import got from 'got/dist/source'
import {resolve} from 'path'
export class Run extends Command {
  static description = 'describe the command here'

  static examples = [
    '$ cg run',
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    agent1: flags.string({description: 'id of agent 1'}),
    agent2: flags.string({description: 'id of agent 2'}),
    code: flags.string({char: 'c', description: 'path to your bot source code'}),
    config: flags.string({description: 'path to config file', default: './cgconfig.json'}),
    language: flags.string({char: 'l', description: 'programming language of your bot source code', options: ['C#']}),
    outdir: flags.string({description: 'directory in which to place the output data from simulation runs, created if doesn\'t exist', default: './cg-out'}),
    output: flags.boolean({char: 'o', description: 'wheter or not to output simulation data to file', default: false}),
    puzzle: flags.string({char: 'p', description: 'name of puzzle or contest used by CodinGame API'}),
  }

  static args = [{name: 'count', description: 'the number of simulations to run on the server. Must be bigger than 0', default: 1}]

  async run() {
    const {args, flags} = this.parse(Run)

    cli.action.start('Reading config file')
    if (!await pathExists(resolve(flags.config))) {
      this.error(`Could not find valid config file at ${resolve(flags.config)}`, {exit: 1})
    }
    const config = await readJson(resolve(flags.config)) as CGConfig
    cli.action.stop()

    if (!flags.language && !config.programmingLanguageId) {
      this.error('No programming language was specified. Please add \'programmingLanguageId\' property to config file or use --language flag.', {exit: 1})
    }

    if (!flags.agent1 && !config.agent1) {
      this.error('No id for agent 1 was specified. Please add \'agent1\' property to config file or use --agent1 flag.', {exit: 1})
    }

    if (!flags.agent2 && !config.agent2) {
      this.error('No id for agent 2 was specified. Please add \'agent1\' property to config file or use --agent1 flag.', {exit: 1})
    }

    if (args.count < 1) {
      this.error(`The count argument must be bigger than 0 and it was ${args.count}`, {exit: 1})
    }

    if (!flags.puzzle && !config.puzzleName) {
      this.error('No puzzle name was specified. Please add \'puzzleName\' property to config file or use --puzzle flag.', {exit: 1})
    }

    if (!flags.code && !config.codePath) {
      this.error('No code path was specified. Please add \'codePath\' property to config file or use --code flag.', {exit: 1})
    }

    if (flags.output && !flags.outdir && !config.outputDir) {
      this.error('The output flag has been set to true but no output directory was specified. Please add \'outputDir\' property to config file or use --outdir flag.', {exit: 1})
    }

    const outdir = resolve(flags.outdir ?? config.outputDir)

    cli.action.start('Fetching test session id from CodinGame')
    const testSessionId = await this.getSessionId(config.cookie, config.userId, flags.puzzle ?? config.puzzleName!)
    cli.action.stop()

    cli.action.start('Grabbing source code')
    const code = (await readFile(resolve(flags.code ?? config.codePath!), 'utf8')).trim()
    cli.action.stop()

    const progress = cli.progress({
      format: ' {bar}\u25A0 ETA: {eta}s | {value}/{total} | Agent1: {agent1Wins} wins ({agent1Percentage}) | Agent2: {agent2Wins} wins ({agent2Percentage}) | Margin of Error: {marginOfError}',
      barCompleteChar: '\u25A0',
      barIncompleteChar: ' '})

    let agent1Wins = 0
    let agent2Wins = 0

    const percentage = new Intl.NumberFormat('en-US', {style: 'percent'})

    const payload: TestSessionPayload = {
      cookie: config.cookie, testSessionId,
      code,
      programmingLanguageId: flags.language ?? config.programmingLanguageId!,
      agent1Id: Number(flags.agent1) || config.agent1!,
      agent2Id: Number(flags.agent2) || config.agent2!,
    }

    const writeOperations: Promise<void>[] = []
    const date = new Date()
    const dateStamp = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`

    this.log('Running simulations...')
    progress.start(args.count, 0, {agent1Wins: 0, agent2Wins: 0, agent1Percentage: 'N/A', agent2Percentage: 'N/A', marginOfError: 'N/A'})
    for (let i = 0; i < args.count; i++) {
      progress.update(i)
      const response: CGResponse = await this.runSimulations(payload) // eslint-disable-line no-await-in-loop

      if (flags.output) {
        const path = outdir + `/${dateStamp}-${i + 1}.json`
        writeOperations.push(outputJson(path, response))
      }

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
    }

    progress.increment(1)
    progress.stop()

    if (writeOperations.length > 0) {
      cli.action.start('Writing simulation data')
      await Promise.all(writeOperations)
      cli.action.stop()
    }
  }

  private async getSessionId(cookie: string, userId: number, puzzleName: string): Promise<string> {
    try {
      const response = await got.post<{ reportReady: boolean; handle: string; direct: boolean }>('https://www.codingame.com/services/Puzzle/generateSessionFromPuzzlePrettyId', {
        headers: {
          cookie,
        },
        json: [userId, puzzleName, false],
        responseType: 'json',
      })
      return response.body.handle
    } catch (error) {
      if (error.response) {
        this.debug(error.response.body)
        this.error(error.message, {exit: 1})
      }
      this.error(`There was a problem fetching a Test Session handle from CodinGame for puzzle ${puzzleName}. Are you sure this is a valid puzzle name?`, {exit: 1})
    }
  }

  private async runSimulations(payload: TestSessionPayload): Promise<CGResponse> {
    try {
      const response = await got.post<CGResponse>('https://www.codingame.com/services/TestSession/play', {
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

interface CGResponse {
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
