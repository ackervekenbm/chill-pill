// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { SettingsScreen } from './SettingsScreen'

const setup = (onSave = vi.fn().mockResolvedValue(undefined)) => {
  render(<SettingsScreen settings={DEFAULT_SETTINGS} onSave={onSave} />)
  return onSave
}

describe('SettingsScreen', () => {
  it('picking a theme applies and saves it', async () => {
    const onSave = setup()
    await userEvent.click(screen.getByRole('radio', { name: /Warm editorial/ }))
    expect(document.documentElement.dataset.theme).toBe('editorial')
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, theme: 'editorial' })
  })

  it('reverts the theme and shows the error when saving fails', async () => {
    document.documentElement.dataset.theme = 'calm'
    setup(vi.fn().mockRejectedValue(new Error('offline')))
    await userEvent.click(screen.getByRole('radio', { name: /Dark dashboard/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    expect(document.documentElement.dataset.theme).toBe('calm')
    expect(screen.getByRole('radio', { name: /Clinical calm/ })).toBeChecked()
  })

  it('saves a valid target on blur', async () => {
    const onSave = setup()
    const sys = screen.getByLabelText('Systolic target')
    await userEvent.clear(sys)
    await userEvent.type(sys, '130')
    await userEvent.tab()
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, targetSys: 130 }))
  })

  it('does not save an out-of-range target', async () => {
    const onSave = setup()
    const sys = screen.getByLabelText('Systolic target')
    await userEvent.clear(sys)
    await userEvent.type(sys, '300')
    await userEvent.tab()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('requires systolic above diastolic', async () => {
    const onSave = setup()
    const sys = screen.getByLabelText('Systolic target')
    await userEvent.clear(sys)
    await userEvent.type(sys, '80')
    await userEvent.tab()
    expect(screen.getByRole('alert')).toHaveTextContent('Systolic target must be higher than diastolic')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('links to the export and the report', () => {
    setup()
    expect(screen.getByRole('link', { name: /Export CSV/ })).toHaveAttribute('href', '/api/export.csv')
    expect(screen.getByRole('link', { name: /Export CSV/ })).toHaveAttribute('download')
    expect(screen.getByRole('link', { name: /Doctor report/ })).toHaveAttribute('href', '/report')
  })

  it('shows the build line', () => {
    setup()
    expect(screen.getByText(/Chill Pill ·/)).toBeInTheDocument()
  })
})
