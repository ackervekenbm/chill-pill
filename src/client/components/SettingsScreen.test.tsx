// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 ackervekenbm

import { render, screen, waitFor, within } from '@testing-library/react'
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

  it('picking a theme right after editing a target keeps the new target', async () => {
    const onSave = setup()
    const sys = screen.getByLabelText('Systolic target')
    await userEvent.clear(sys)
    await userEvent.type(sys, '130')
    await userEvent.click(screen.getByRole('radio', { name: /Warm editorial/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, targetSys: 130, theme: 'editorial' })
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

})

describe('About', () => {
  const href = (name: string | RegExp) => screen.getByRole('link', { name }).getAttribute('href')

  it('shows a local build as a development build and links the repo', () => {
    setup()
    const about = within(screen.getByRole('region', { name: 'About' }))
    expect(about.getByText('development build')).toBeInTheDocument()
    expect(href('ackervekenbm/chill-pill')).toBe('https://github.com/ackervekenbm/chill-pill')
    expect(href('Report an issue')).toBe('https://github.com/ackervekenbm/chill-pill/issues')
    expect(href('ackervekenbm')).toBe('https://github.com/ackervekenbm')
    expect(href('AGPL-3.0-or-later')).toBe('https://github.com/ackervekenbm/chill-pill/blob/main/LICENSE')
  })

  it('links an image build to its commit', () => {
    const build = { sha: 'abcdef1234567890', time: '2026-11-19T14:05:00+01:00', repo: 'someone/chill-pill', license: '' }
    render(<SettingsScreen settings={DEFAULT_SETTINGS} onSave={vi.fn()} build={build} />)
    expect(href('abcdef1')).toBe('https://github.com/someone/chill-pill/commit/abcdef1234567890')
    expect(screen.getByText(/19 Nov 2026/)).toBeInTheDocument()
    expect(screen.getByText('not chosen yet')).toBeInTheDocument()
    for (const a of within(screen.getByRole('region', { name: 'About' })).getAllByRole('link')) expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
