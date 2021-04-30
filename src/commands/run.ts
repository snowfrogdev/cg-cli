import {Command, flags} from '@oclif/command'
import {pathExistsSync, readJsonSync} from 'fs-extra'
import got from 'got/dist/source'
export class Run extends Command {
  static description = 'describe the command here'

  static examples = [
    '$ cg run',
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    config: flags.string({char: 'c', description: 'path to config file', default: './cgconfig.json'}),
  }

  async run() {
    const {flags} = this.parse(Run)
    if (!pathExistsSync(flags.config)) {
      this.error(`Could not find valid config file at ${flags.config}`, {exit: 1})
    }
    const config = readJsonSync(flags.config) as CGConfig
    // const sessionHandle = await this.getSessionHandle()
  }

  private getConfigFromFile(path: string): CGConfig | null {
    try {
      return readJsonSync(path) as CGConfig
    } catch {
      return null
    }
  }

  private async getSessionHandle(cookie: string, userId: number, puzzleName: string): Promise<string> {
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
      this.debug(error.response.body)
      throw new Error(error.message)
    }
  }
}

interface CGConfig {
  cookie: string;
  userId: number;
  puzzleName?: string;
  codePath?: string;
}
