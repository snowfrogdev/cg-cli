import * as inquirer from 'inquirer'
import {User} from '../abstractions'
import {CodinGameApiService, GetFilteredArenaDivisionRoomLeaderboardOptions} from './codingame-api.service'

enum FilterChoices {
  Around, Following, Top10, Keyword
}

export class InteractiveOpponentSearchService {
  private readonly filterChoices = [
    {name: 'have a similar rank as mine', value: FilterChoices.Around},
    {name: 'I follow', value: FilterChoices.Following},
    {name: 'are in the Top 10 of my league', value: FilterChoices.Top10},
    {name: 'have a specific name', value: FilterChoices.Keyword},
  ]

  private opponentChoices: {
      name: string;
      value: {
        agentId: number;
        pseudo: string;
      };
  }[] = []

  constructor(private readonly apiService: CodinGameApiService) {} // eslint-disable-line no-useless-constructor

  async getUserFromInteractive(): Promise<User[]> {
    const {filter, keyword} = await inquirer.prompt<{ filter: FilterChoices; keyword: string}>([
      {
        name: 'filter',
        message: 'Look for opponents that',
        type: 'list',
        choices: this.filterChoices,
        pageSize: 7,
      },
      {
        name: 'keyword',
        message: 'Search for name:',
        when: answers => answers.filter === FilterChoices.Keyword,
        validate: async (keyword, answers) => {
          await this.setOpponentChoices(answers?.filter!, keyword)
          return this.opponentChoices.length > 0 ? true : "Can't find an opponent with that name. Try something else."
        },
      },
    ])

    if (this.opponentChoices.length === 0) await this.setOpponentChoices(filter, keyword)

    const {users} = await inquirer.prompt<{ users: User[] }>([
      {
        name: 'users',
        message: 'Select the opponent(s)',
        type: 'checkbox',
        choices: this.opponentChoices,
        pageSize: 7,
        validate: input => {
          return input.length > 0 ? true : 'You have to select at least one opponent.'
        },
      },
    ])

    return users
  }

  private async setOpponentChoices(filter: FilterChoices, keyword?: string) {
    let options: GetFilteredArenaDivisionRoomLeaderboardOptions
    switch (filter) {
    case FilterChoices.Around: options = {active: true, column: 'CODINGAMER', filter: 'AROUND'}
      break
    case FilterChoices.Following: options = {active: true, column: 'CODINGAMER', filter: 'FOLLOWING'}
      break
    case FilterChoices.Top10:  options = {active: true, column: 'CODINGAMER', filter: 'ALL'}
      break
    case FilterChoices.Keyword: options = {active: true, column: 'KEYWORD', filter: keyword!}
    }

    let users = (await this.apiService.getFilteredArenaDivisionRoomLeaderboard(options)).users!
    if (filter === FilterChoices.Top10) users = users.slice(0, 10)
    this.opponentChoices = users.map(user => ({name: user.pseudo!, value: {agentId: user.agentId!, pseudo: user.pseudo!}})) // being a bad boy here, should remove ! and validate
  }
}
