@snowfrog/cg-cli
================

A CLI for all your CodinGame needs

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@snowfrog/cg-cli.svg)](https://npmjs.org/package/@snowfrog/cg-cli)
[![CircleCI](https://circleci.com/gh/snowfrogdev/cg-cli/tree/master.svg?style=shield)](https://circleci.com/gh/snowfrogdev/cg-cli/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/@snowfrog/cg-cli.svg)](https://npmjs.org/package/@snowfrog/cg-cli)
[![License](https://img.shields.io/npm/l/@snowfrog/cg-cli.svg)](https://github.com/snowfrogdev/cg-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @snowfrog/cg-cli
$ cg COMMAND
running command...
$ cg (-v|--version|version)
@snowfrog/cg-cli/0.2.2 win32-x64 node-v14.16.1
$ cg --help [COMMAND]
USAGE
  $ cg COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g @snowfrog/cg-cli
$ cg COMMAND
running command...
$ cg (-v|--version|version)
@snowfrog/cg-cli/0.2.1 win32-x64 node-v14.16.1
$ cg --help [COMMAND]
USAGE
  $ cg COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cg autocomplete [SHELL]`](#cg-autocomplete-shell)
* [`cg help [COMMAND]`](#cg-help-command)
* [`cg init`](#cg-init)
* [`cg run [COUNT]`](#cg-run-count)

## `cg autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ cg autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

EXAMPLES
  $ cg autocomplete
  $ cg autocomplete bash
  $ cg autocomplete zsh
  $ cg autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.3.0/src/commands/autocomplete/index.ts)_

## `cg help [COMMAND]`

display help for cg

```
USAGE
  $ cg help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `cg init`

initializes a CodinGame project by adding a cgconfig.json file

```
USAGE
  $ cg init

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/init.ts](https://github.com/snowfrogdev/cg-cli/blob/v0.2.2/src/commands/init.ts)_

## `cg run [COUNT]`

run test session playouts between two bots

```
USAGE
  $ cg run [COUNT]

ARGUMENTS
  COUNT  [default: 1] the number of simulations to run on the server. Must be bigger than 0

OPTIONS
  -c, --code=code      path to your bot source code
  -h, --help           show CLI help
  -l, --language=C#    programming language of your bot source code
  -o, --output         whether or not to output simulation data to file
  -p, --puzzle=puzzle  name of puzzle or contest used by CodinGame API
  --agent1=agent1      id of agent 1
  --agent2=agent2      id of agent 2
  --config=config      [default: ./cgconfig.json] path to config file
  --outdir=outdir      directory in which to place the output data from simulation runs, created if doesn't exist

EXAMPLE
  $ cg run 10 -o
  Reading config file... done
  Validating inputs... done
  Fetching test session id from CodinGame... done
  Grabbing source code... done
  Running simulations...
    ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ ETA: 0s | 10/10 | Agent1: 5 wins (50%) | Agent2: 5 wins (50%) | Margin of 
  Error: 32%
  Writing simulation data... done
```

_See code: [src/commands/run.ts](https://github.com/snowfrogdev/cg-cli/blob/v0.2.2/src/commands/run.ts)_
<!-- commandsstop -->
* [`cg autocomplete [SHELL]`](#cg-autocomplete-shell)
* [`cg help [COMMAND]`](#cg-help-command)
* [`cg init`](#cg-init)
* [`cg run [COUNT]`](#cg-run-count)

## `cg autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ cg autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

EXAMPLES
  $ cg autocomplete
  $ cg autocomplete bash
  $ cg autocomplete zsh
  $ cg autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.3.0/src/commands/autocomplete/index.ts)_

## `cg help [COMMAND]`

display help for cg

```
USAGE
  $ cg help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `cg init`

initializes a CodinGame project by adding a cgconfig.json file

```
USAGE
  $ cg init

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/init.ts](https://github.com/snowfrogdev/cg-cli/blob/v0.2.1/src/commands/init.ts)_

## `cg run [COUNT]`

run test session playouts between two bots

```
USAGE
  $ cg run [COUNT]

ARGUMENTS
  COUNT  [default: 1] the number of simulations to run on the server. Must be bigger than 0

OPTIONS
  -c, --code=code      path to your bot source code
  -h, --help           show CLI help
  -l, --language=C#    programming language of your bot source code
  -o, --output         whether or not to output simulation data to file
  -p, --puzzle=puzzle  name of puzzle or contest used by CodinGame API
  --agent1=agent1      id of agent 1
  --agent2=agent2      id of agent 2
  --config=config      [default: ./cgconfig.json] path to config file
  --outdir=outdir      directory in which to place the output data from simulation runs, created if doesn't exist

EXAMPLE
  $ cg run 10 -o
  Reading config file... done
  Validating inputs... done
  Fetching test session id from CodinGame... done
  Grabbing source code... done
  Running simulations...
    ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ ETA: 0s | 10/10 | Agent1: 5 wins (50%) | Agent2: 5 wins (50%) | Margin of 
  Error: 32%
  Writing simulation data... done
```

_See code: [src/commands/run.ts](https://github.com/snowfrogdev/cg-cli/blob/v0.2.1/src/commands/run.ts)_
<!-- commandsstop -->
* [`cg autocomplete [SHELL]`](#cg-autocomplete-shell)
* [`cg help [COMMAND]`](#cg-help-command)
* [`cg init`](#cg-init)
* [`cg run [COUNT]`](#cg-run-count)
