import {Command, flags} from '@oclif/command'
import {cli} from 'cli-ux'
import {pathExists, readFile, readJson, writeFile} from 'fs-extra'
import {basename, resolve} from 'path'
import {CGConfig} from '../abstractions'
import {programmingLanguageChoices} from '../constants/programming-language-choices'
import klaw = require('klaw');

export default class Bundle extends Command {
  static description = 'bundle your source code into one file that can be submitted to CodinGame'

  static flags = {
    help: flags.help({char: 'h'}),
    code: flags.string({char: 'c', description: 'path to the file containing the code to be submitted to CodinGame'}),
    config: flags.string({description: 'path to config file', default: './cgconfig.json'}),
    language: flags.string({char: 'l', description: 'programming language of your bot source code', options: programmingLanguageChoices}),
    source: flags.string({char: 's', description: 'path to folder containing the source code to be bundled'}),
  }

  async run() {
    const {flags} = this.parse(Bundle)
    const config = await this.getConfig(flags.config)

    this.validateInputs(flags, config)
    const programmingLanguageId = flags.language ?? config.programmingLanguageId!
    const sourcePath = flags.source ?? config.sourcePath!
    const codePath = flags.code ?? config.codePath!

    cli.action.start(`Bundling your ${programmingLanguageId} source code located in ${sourcePath}`)
    switch (programmingLanguageId) {
    case 'C#': await bundleCSharp(sourcePath, codePath)
      break
    default: this.error(`Unfortunately bundling is not yet supported for ${programmingLanguageId}`)
    }
    cli.action.stop(`Done. Your bundle is located at ${codePath}`)
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

  private validateInputs(flags: BundleCommandFlags, config: CGConfig) {
    cli.action.start('Validating inputs')

    if (!flags.language && !config.programmingLanguageId) {
      this.error('No programming language was specified. Please add \'programmingLanguageId\' property to config file or use --language flag.', {exit: 1})
    }

    if (!flags.code && !config.codePath) {
      this.error('No path and filename was specified for code to be submitted to CodinGame. Please add \'codePath\' property to config file or use --code flag.', {exit: 1})
    }

    if (!flags.source && !config.sourcePath) {
      this.error('No path was specified for the folder containing the source code to be bundled. Please add \'sourcePath\' property to config file or use --source flag.', {exit: 1})
    }
    cli.action.stop()
  }
}

interface BundleCommandFlags {
    help: void;
    code: string | undefined;
    config: string;
    language: string | undefined;
    source: string | undefined;
}

async function bundleCSharp(sourcePath: string, bundledFilePath: string): void {
  let output = ''
  const allUsings = new Map<string, string>()
  const allNamespaces = new Set<string>()
  const nameSpaceRegex = /\bnamespace\s+(\S+)[\s\n\r]+{([\s\S]+)}/
  const usingRegex = /\busing\s+([\w\.]+);/g

  const paths = await getFilePathsByExtension(sourcePath, ['bin', 'obj'], '.cs')

  for (const path of paths) {
    let code = (await readFile(resolve(path), 'utf8')) // eslint-disable-line no-await-in-loop
    const fileNamespace = code.match(nameSpaceRegex)?.[1]
    const fileUsings = new Map([...code.matchAll(usingRegex)].map(matchArray => [matchArray[1], matchArray[0]]))
    code = code.replace(nameSpaceRegex, '$2')
    code = code.replace(usingRegex, '')

    if (fileNamespace) allNamespaces.add(fileNamespace)
    fileUsings.forEach((value, key) => allUsings.set(key, value))

    output += code + '\n'
  }

  allNamespaces.forEach(namespace => allUsings.delete(namespace))
  output.trim()
  allUsings.forEach(value => {
    output = value + '\n' + output
  })

  try {
    await writeFile(resolve(bundledFilePath), output, 'utf-8')
  } catch (error) {
    throw new Error(`There was a problem trying to write to ${bundledFilePath}. ${error.message}`)
  }
}

async function getFilePathsByExtension(rootDir: string, excludedDirs: string[], extension: string): Promise<string[]> {
  const filePaths: string[] = []
  return new Promise((success, reject) => {
    const filter = (path: string) => {
      const name = basename(path)
      return !excludedDirs.includes(name)
    }

    klaw(resolve(rootDir), {filter})
    .on('data', item => {
      if (basename(item.path).toLocaleLowerCase().endsWith(extension)) {
        filePaths.push(item.path)
      }
    })
    .on('end', () => success(filePaths))
    .on('error', (error: Error) => {
      reject(new Error(`Something went wrong while bundling your source code. ${error.message}`))
    })
  })
}
