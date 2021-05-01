import {Command, flags} from '@oclif/command'

export default class Init extends Command {
  static description = 'initializes a CodinGame project by adding a cgconfig.json file'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  // static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Init)
    this.error('Not yet implemented')
  }
}
