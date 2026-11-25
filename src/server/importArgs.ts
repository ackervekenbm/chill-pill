// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

export interface ImportArgs {
  file: string
  base?: string
  dryRun: boolean
}

export function parseArgs(argv: string[]): ImportArgs | null {
  const dryRun = argv.includes('--dry-run')
  const toIdx = argv.indexOf('--to')
  const base = toIdx >= 0 ? argv[toIdx + 1] : undefined
  const file = argv.find((a, i) => !a.startsWith('--') && (toIdx < 0 || i !== toIdx + 1))
  if (!file || (toIdx >= 0 && !base) || (!base && !dryRun)) return null
  return { file, base, dryRun }
}
