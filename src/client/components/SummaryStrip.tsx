// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import type { RangeSummary } from '../../shared/types'

export const bp = (x: { sys: number; dia: number }) => `${Math.round(x.sys)}/${Math.round(x.dia)}`
export const daysText = (n: number) => (n === 1 ? '1 day' : `${n} days`)

export function SummaryStrip({ summary, range }: { summary: RangeSummary | null; range: string }) {
  const text = summary
    ? `${range} · ${bp(summary)} avg · ${Math.round(summary.onTargetShare * 100)}% of days on target · ${daysText(summary.days)} measured`
    : `${range} · no readings`
  return <p className="summary">{text}</p>
}
