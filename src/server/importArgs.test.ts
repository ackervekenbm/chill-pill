// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { describe, expect, it } from 'vitest'
import { parseArgs } from './importArgs'

describe('parseArgs', () => {
  it('file first with --dry-run and no --to', () => {
    expect(parseArgs(['a.xlsx', '--dry-run'])).toEqual({ file: 'a.xlsx', base: undefined, dryRun: true })
  })
  it('file after --to url', () => {
    expect(parseArgs(['--to', 'http://x', 'a.xlsx'])).toEqual({ file: 'a.xlsx', base: 'http://x', dryRun: false })
  })
  it('--to url after file', () => {
    expect(parseArgs(['a.xlsx', '--to', 'http://x'])).toEqual({ file: 'a.xlsx', base: 'http://x', dryRun: false })
  })
  it('missing file -> null', () => {
    expect(parseArgs(['--to', 'http://x'])).toBeNull()
  })
  it('missing --to without --dry-run -> null', () => {
    expect(parseArgs(['a.xlsx'])).toBeNull()
  })
})
