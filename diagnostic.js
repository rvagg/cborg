#!/usr/bin/env node

import { tokensToDiagnostic } from './lib/diagnostic.js'

const bin = Buffer.from(process.argv[2], 'hex')

for (const line of tokensToDiagnostic(bin)) {
  console.log(line)
}
