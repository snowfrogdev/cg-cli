import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import {outputJson} from 'fs-extra'
import got from 'got'
import * as inquirer from 'inquirer'
import {CGConfig} from '../abstractions/cgconfig'
import {programmingLanguageChoices} from '../constants/programming-language-choices'

export default class Init extends Command {
  static description = 'initializes a CodinGame project by adding a cgconfig.json file'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    const {cookie} = await inquirer.prompt<{ cookie: string }>([
      {
        name: 'cookie',
        message: 'Please provide the value of the \'rememberMe\' cookie from your browser.\nInstructions: https://github.com/snowfrogdev/cg-cli/blob/master/README.md.\nrememberMe=',
        validate: (input: string) => input.length !== 0 || 'cookie is required',
        filter: (input: string) => input.replace('rememberMe=', ''),
      },
    ])

    const userId = Number(cookie.slice(0, 7))

    const contestChoices = await this.getContests(`rememberMe=${cookie}`, userId)

    const {puzzleName, programmingLanguageId, codePath} = await inquirer.prompt<{ puzzleName: string; programmingLanguageId: string; codePath: string}>([
      {
        name: 'puzzleName',
        message: 'What puzzle are you working on',
        type: 'list',
        choices: contestChoices,
        pageSize: 7,
      },
      {
        name: 'programmingLanguageId',
        message: 'What language will you be submitting to CodinGame',
        type: 'list',
        choices: programmingLanguageChoices,
        pageSize: 7,
      },
      {
        name: 'codePath',
        message: 'What is the relative path of the code you\'ll be submitting to CodinGame',
      },
    ])

    const config: CGConfig = {cookie, userId, puzzleName, programmingLanguageId, codePath, agent1: -1, agent2: -2}

    this.saveConfig(config)

    this.log('You\'re all set. Have fun!')
  }

  private async getContests(cookie: string, userId: number): Promise<ContestChoice[]> {
    cli.action.start('Fetching list of Bot Programming Challenges from CodinGame')
    const contestIds: number[] = await this.getContestIds(cookie, userId)
    const contestChoices = await this.getContestsData(cookie, userId, contestIds)
    cli.action.stop()
    return contestChoices
  }

  private async getContestIds(cookie: string, userId: number): Promise<number[]> {
    try {
      const response = await got.post<MinimalProgressData[]>('https://www.codingame.com/services/Puzzle/findAllMinimalProgress', {
        headers: {
          cookie,
        },
        json: [userId],
        responseType: 'json',
      })
      return response.body.filter(puzzle => puzzle.level === 'multi').map(puzzle => puzzle.id)
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      this.log()
      this.error(`There was a problem fetching contest ids from CodinGame. ${message}`, {exit: 1})
    }
  }

  private async getContestsData(cookie: string, userId: number, contestIds: number[]): Promise<ContestChoice[]> {
    try {
      const response = await got.post<ProgressData[]>('https://www.codingame.com/services/Puzzle/findProgressByIds', {
        headers: {
          cookie,
        },
        json: [contestIds, userId, 2],
        responseType: 'json',
      })

      const sortByTitle = (a: ProgressData, b: ProgressData) => {
        const titleA = a.title.toUpperCase() // ignore upper and lowercase
        const titleB = b.title.toUpperCase() // ignore upper and lowercase
        if (titleA < titleB) return -1
        if (titleA > titleB) return 1
        return 0
      }
      return response.body.sort(sortByTitle).map(puzzle => ({name: puzzle.title, value: puzzle.prettyId}))
    } catch (error) {
      const message = error.response ? error.response.body.message : error.message
      this.log()
      this.error(`There was a problem fetching contest data from CodinGame. ${message}`, {exit: 1})
    }
  }

  private async saveConfig(config: CGConfig) {
    cli.action.start('Writing config file')
    const filePath = './cgconfig.json'
    try {
      outputJson(filePath, config)
    } catch (error) {
      this.error(`There was a problem trying to write to ${filePath}. ${error.message}`, {exit: 1})
    }
    cli.action.stop()
  }
}

interface MinimalProgressData {
  id: number;
  level: 'easy' | 'medium' | 'hard' | 'expert' | 'multi';
  validatorScore: number;
  submitted: boolean;
  creationTime: number;
  rank: number;
  solvedCount: number;
  communityCreation: true;
  feeback: {
    feedbackId: number;
    feebacks: number[];
  };
}

interface ProgressData {
  id: number;
  level: 'easy' | 'medium' | 'hard' | 'expert' | 'multi';
  rank: number;
  coverBinaryId: number;
  title: string;
  validatorScore: number;
  achievementCount: number;
  doneAchievementCount: number;
  forumLink: string;
  total: number;
  globalTotal: number;
  contributor: {
    userId: number;
    pseudo: string;
    publicHandle: string;
    enable: false;
    avatar: number;
    cover: number;
  };
  solvedCount: number;
  attemptCount: number;
  feeback: {
    feedbackId: number;
    feebacks: number[];
  };
  optimCriteriaId: 'rank' | 'fuel' | 'source_code_size' | 'character_count' | 'score' | 'Points' | 'Level' | 'countActions';
  topics: any[];
  creationTime: number;
  type: string;
  prettyId: string;
  detailsPageUrl: string;
  puzzleLeaderboardId: string;
  communityCreation: true;
}

interface ContestChoice {
  name: string;
  value: string;
}
