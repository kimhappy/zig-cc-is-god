import { existsSync, mkdirSync } from 'fs'
import { writeFile             } from 'fs/promises'
import   path                    from 'path'
import   yargs                   from 'yargs'
import { hideBin               } from 'yargs/helpers'

export const getTargetTriples = async (): Promise< string[] > => {
  const proc = Bun.spawnSync(['zig', 'targets'], { stdio: ['ignore', 'pipe', 'pipe'] })

  if (proc.signalCode) {
    throw new Error(`\`zig targets\` failed with signal ${ proc.signalCode }\n${ proc.stderr.toString() }`)
  }

  if (!proc.success) {
    throw new Error(`\`zig targets\` failed with exit code ${ proc.exitCode }\n${ proc.stderr.toString() }`)
  }

  const output        = proc.stdout.toString()
  const libcMatch     = output.match(/\.libc\s*=\s*\.(\{[^}]*\})/)![ 1 ]
  const targetMatches = libcMatch.matchAll(/"([^"]*)"/g)
  return [...targetMatches].map(match => match[ 1 ])
}

export const getToolchain = (targetTriple: string): string => {
  const [ZIG_ARCH, ZIG_OS, ZIG_LIBC] = targetTriple.split('-')

  const CMAKE_SYSTEM_NAME = {
    'windows': 'Windows',
    'macos'  : 'Darwin' ,
    'wasi'   : 'WASI'
  } [ ZIG_OS   ] ?? 'Linux'
  const CMAKE_SYSTEM_PROCESSOR = {
    'x86'    : 'X86',
    'x86_64' : 'AMD64'
  } [ ZIG_ARCH ] ?? ZIG_ARCH

  return `if ( NOT CMAKE_GENERATOR STREQUAL "Ninja" )
  message ( FATAL_ERROR "Unsupported generator" )
endif ()

find_program ( ZIG_EXECUTABLE zig REQUIRED )

set ( CMAKE_C_COMPILER \${ZIG_EXECUTABLE} )
set ( CMAKE_C_COMPILER_ARG1 "cc" )

set ( CMAKE_CXX_COMPILER \${ZIG_EXECUTABLE} )
set ( CMAKE_CXX_COMPILER_ARG1 "c++" )

set ( CMAKE_AR \${ZIG_EXECUTABLE} )
set ( CMAKE_AR_ARG1 "ar" )

set ( CMAKE_RANLIB \${ZIG_EXECUTABLE} )
set ( CMAKE_RANLIB_ARG1 "ranlib" )

set ( ZIG_ARCH "${ ZIG_ARCH }" )
set ( ZIG_OS "${ ZIG_OS }" )
set ( ZIG_LIBC "${ ZIG_LIBC }" )

set ( ZIG_TARGET "\${ZIG_ARCH}-\${ZIG_OS}-\${ZIG_LIBC}")
set ( CMAKE_SYSTEM_NAME "${ CMAKE_SYSTEM_NAME }" )
set ( CMAKE_SYSTEM_PROCESSOR "${ CMAKE_SYSTEM_PROCESSOR }" )`
}

const main = async (): Promise< void > => {
  const argv = yargs(hideBin(process.argv))
    .option('target', {
      array  : true,
      string : true,
      alias  : 't' ,
      default: []
    })
    .option('all', {
      boolean: true,
      alias  : 'a' ,
      default: false
    })
    .option('output', {
      string : true,
      alias  : 'o' ,
      default: '.'
    })
    .parseSync()

  const zigTargets = await getTargetTriples()

  if (argv.all) {
    argv.target = zigTargets
  }
  else if (argv.target.length === 0) {
    console.log('Available targets:')
    console.log(zigTargets.join('\n'))
    return
  }
  else {
    argv.target          = [...new Set(argv.target)]
    const invalidTargets = argv.target.filter(
      target => !zigTargets.includes(target))

    if (invalidTargets.length > 0) {
      throw new Error(`Invalid targets:\n${ invalidTargets.join('\n') }`)
    }
  }

  if (!existsSync(argv.output)) {
    mkdirSync(argv.output, { recursive: true })
  }

  await Promise.all(argv.target.map(async (target: string) => {
    const outPath   = path.join(argv.output, `${ target }.cmake`)
    const toolchain = getToolchain(target)
    await writeFile(outPath, toolchain)
  }))
}

if (import.meta.main) {
  try {
    await main()
  }
  catch (error) {
    console.error(error)
    process.exit(1)
  }
}
