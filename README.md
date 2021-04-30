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
# Usage
<!-- usage -->
```sh-session
$ npm install -g @snowfrog/cg-cli
$ cg COMMAND
running command...
$ cg (-v|--version|version)
@snowfrog/cg-cli/0.0.0 win32-x64 node-v14.16.1
$ cg --help [COMMAND]
USAGE
  $ cg COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cg hello [FILE]`](#cg-hello-file)
* [`cg help [COMMAND]`](#cg-help-command)

## `cg hello [FILE]`

describe the command here

```
USAGE
  $ cg hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ cg hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/snowfrogdev/cg-cli/blob/v0.0.0/src/commands/hello.ts)_

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
<!-- commandsstop -->
