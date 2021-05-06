import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import {ensureDir, outputJson, pathExists, readFile, readJson, writeFile} from 'fs-extra'
import * as notifier from 'node-notifier'
import {resolve} from 'path'
import {CGConfig, TestSessionPlayResponse, User, UserResponse} from '../abstractions'
import {programmingLanguageChoices} from '../constants/programming-language-choices'
import {CodinGameApiService} from '../services/codingame-api.service'
import {GameDataGeneratorOptions, GameDataGeneratorService} from '../services/game-data-generator.service'
import {InteractiveOpponentSearchService} from '../services/interactive-opponent-search.service'

export class Play extends Command {
  static description = 'play test session playouts between two bots'

  static examples = [
    `$ cg play 10 -o
Reading config file... done
Validating inputs... done
Fetching test session id from CodinGame... done
Grabbing source code... done
Playing games...
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ ETA: 0s | 10/10 | Agent1: 5 wins (50%) | Agent2: 5 wins (50%) | Margin of Error: 32%
Writing game data... done`,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    agent1: flags.string({description: 'id of agent 1, a value of -1 means your own code, a value of -2 means the boss for the league'}),
    agent2: flags.string({description: 'id of agent 2, a value of -1 means your own code, a value of -2 means the boss for the league'}),
    code: flags.string({char: 'c', description: 'path to the file containing the code to be submitted to CodinGame'}),
    config: flags.string({description: 'path to config file', default: './cgconfig.json'}),
    interactive: flags.boolean({char: 'i', description: 'interactive menu to choose opponent(s) to agent 1', default: false, exclusive: ['agent2']}),
    language: flags.string({char: 'l', description: 'programming language of your bot source code', options: programmingLanguageChoices}),
    outdir: flags.string({description: 'directory in which to place the output data from simulation playthroughs, created if doesn\'t exist', dependsOn: ['output']}),
    output: flags.boolean({char: 'o', description: 'whether or not to output simulation data to file', default: false}),
    puzzle: flags.string({char: 'p', description: 'name of puzzle or contest used by CodinGame API'}),
    replay: flags.boolean({char: 'r', description: 'use the same game conditions as the last game.', default: false}),
    top10: flags.boolean({description: 'play agent1 against the top 10 bots in the league', default: false, exclusive: ['agent2']}),
  }

  static args = [{name: 'count', description: 'the number of games to play on the server. Must be bigger than 0', default: 1}]

  async run() {
    const {args, flags}: { args: PlayCommandArgs; flags: PlayCommandFlags } = this.parse(Play)

    const config = await this.getConfig(flags.config)

    this.validateInputs(flags, config, args)
    const cookie = `rememberMe=${config.cookie}`
    const outdir = resolve(flags.outdir ?? config.outputDir ?? './cg-out')
    const puzzleName = flags.puzzle ?? config.puzzleName!
    const codePath = flags.code ?? config.codePath!
    const programmingLanguageId = flags.language ?? config.programmingLanguageId!
    const agent1Id = Number(flags.agent1) || config.agent1!
    const agent2Id = flags.agent2 ? [Number(flags.agent2)] : config.agent2!
    const count = Number(args.count)
    const apiService = await CodinGameApiService.build(cookie, config.userId!, puzzleName)

    const gameOptions = flags.replay ? await this.getGameOptions(outdir) : null
    const code = await this.getCode(codePath)

    let users: User[]
    if (flags.interactive) {
      const opponentSearchService = new InteractiveOpponentSearchService(apiService)
      users = await opponentSearchService.getUserFromInteractive()
    } else {
      users = await this.getRequestedUsers(apiService, agent1Id, agent2Id, flags.top10)
    }

    const options: GameDataGeneratorOptions = {cookie, code, programmingLanguageId, agent1Id, agent2: users, gameOptions}
    const gameDataIterator = await this.getGameDataIterator(apiService, options, count)

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

  private validateInputs(flags: PlayCommandFlags, config: CGConfig, args: PlayCommandArgs) {
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
      this.error('No id(s) for agent 2 was specified. Please add \'agent2\' property to config file or use --agent2 flag.', {exit: 1})
    }

    if (!Array.isArray(config.agent2) || config.agent2.length === 0) {
      this.error('The \'agent2\' property in the config file must be an array of one or more agent ids.', {exit: 1})
    }

    if (!flags.puzzle && !config.puzzleName) {
      this.error('No puzzle name was specified. Please add \'puzzleName\' property to config file or use --puzzle flag.', {exit: 1})
    }

    if (!flags.code && !config.codePath) {
      this.error('No code path was specified. Please add \'codePath\' property to config file or use --code flag.', {exit: 1})
    }
    cli.action.stop()
  }

  private async getGameOptions(path: string) {
    cli.action.start('Grabbing cached gameOptions')
    try {
      const gameOptions = (await readFile(resolve(path + '/cached-game-options.txt'), 'utf8')).trim()
      cli.action.stop()
      return gameOptions
    } catch (error) {
      this.error(`There was a problem trying to read gameOptions from ${path} + '/cached-game-options.txt'. ${error.message}`, {exit: 1})
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

  private async getRequestedUsers(api: CodinGameApiService, agent1Id: number, agent2Id: number[], hasTop10: boolean): Promise<User[]> {
    let users: UserResponse[]
    const top10 = await this.getTop10Users(api)
    const bossId = top10[0].agentId
    if (hasTop10) {
      users = top10
    } else {
      agent2Id = agent2Id.map(agentId => agentId === -2 ? bossId! : agentId) // being a bad boy here, should remove ! and validate
      users = await this.getUsersByAgentId(api, agent2Id)
    }
    return users.map(user => ({agentId: user.agentId!, pseudo: user.pseudo!})) // being a bad boy here, should remove ! and validate
  }

  private async getGameDataIterator(apiService: CodinGameApiService, options: GameDataGeneratorOptions, count: number) {
    this.log('Playing games...')
    const gameDataGeneratorService = new GameDataGeneratorService(apiService, options)
    let gameDataIterator: AsyncGenerator<TestSessionPlayResponse>
    if (options.agent2.length > 1) {
      if (count > 1) this.warn(`You passed a count flag of ${count} but multi agent plays will only run once per agent.`)
      gameDataIterator = gameDataGeneratorService.generateGameDataMulti()
    } else {
      gameDataIterator = gameDataGeneratorService.generateGameData(count)
    }
    return gameDataIterator
  }

  private async getTop10Users(apiService: CodinGameApiService): Promise<User[]> {
    const users = (await apiService.getFilteredArenaDivisionRoomLeaderboard()).users

    if (!users) {
      throw new Error('Could not fetch users from CodinGame servers.')
    }
    return users.slice(0, 10).map(user => ({agentId: user.agentId!, pseudo: user.pseudo!})) // being a bad boy here, should remove ! and validate
  }

  private async getUsersByAgentId(apiService: CodinGameApiService, agentIds: number[]): Promise<User[]> {
    const users = (await apiService.getFilteredArenaDivisionRoomLeaderboard()).users

    if (!users) {
      throw new Error('Could not fetch users from CondinGame servers.')
    }

    const result: User[] = []
    for (const agentId of agentIds) {
      const user = users.find(user => user.agentId === agentId)
      result.push({agentId, pseudo: user?.pseudo ?? ' - '})
    }

    return result
  }

  private async processGameData(gameDataIterator: AsyncGenerator<TestSessionPlayResponse, void, unknown>, output: boolean, outdir: string) {
    const writeOperations: Promise<void>[] = []
    const date = new Date()
    const dateStamp = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
    let i = 1
    for await (const gameData of gameDataIterator) {
      if (output) {
        const path = outdir + `/${dateStamp}-${i}.json`
        writeOperations.push(outputJson(resolve(path), gameData))
      }

      await ensureDir(resolve(outdir))
      await writeFile(resolve(outdir + '/cached-game-options.txt'), gameData.refereeInput)

      i++
    }
    this.log('Simulations done.')

    if (writeOperations.length > 0) {
      cli.action.start('Writing game data')
      await Promise.all(writeOperations)
      cli.action.stop()
    }
  }
}

interface PlayCommandArgs {
  count: string;
}

interface PlayCommandFlags {
  help: void;
  agent1: string | undefined;
  agent2: string | undefined;
  code: string | undefined;
  config: string;
  interactive: boolean;
  language: string | undefined;
  outdir: string | undefined;
  output: boolean;
  puzzle: string | undefined;
  replay: boolean;
  top10: boolean;
}
