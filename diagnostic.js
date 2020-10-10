#!/usr/bin/env node

import { tokensToDiagnostic } from './lib/diagnostic.js'
import { fromHex } from './lib/common.js'

const bin = fromHex(process.argv[2])

for (const line of tokensToDiagnostic(bin)) {
  console.log(line)
}
