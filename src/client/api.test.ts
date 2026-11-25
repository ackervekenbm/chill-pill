// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { expect, it, vi } from 'vitest'
import { addReading, ApiError } from './api'

it('turns a network failure into an ApiError with status 0', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  const err = await addReading({ takenAt: '2026-11-20T08:00', sys: 120, dia: 80, pulse: 60 }).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(0)
})

it('turns a non-JSON 200 into an ApiError', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
  await expect(addReading({ takenAt: '2026-11-20T08:00', sys: 120, dia: 80, pulse: 60 })).rejects.toBeInstanceOf(ApiError)
})
