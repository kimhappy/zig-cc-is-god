#!/usr/bin/env bun

import { join } from 'path'
import   dts    from 'bun-plugin-dts'

const main = async (): Promise< void > => {
  await Bun.build({
    entrypoints: [join('src', 'index.ts')],
    outdir     : 'dist',
    minify     : true  ,
    splitting  : false ,
    target     : 'bun' ,
    naming     : {
      entry: join('[dir]', '[name].[ext]'),
      chunk: join('[dir]', '[name].[ext]'),
      asset: join('[dir]', '[name].[ext]')
    },
    define     : {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    plugins    : [
      dts()
    ]
  })
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
