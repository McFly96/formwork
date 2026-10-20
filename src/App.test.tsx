import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const cardLabels = () =>
  within(screen.getByRole('region', { name: 'Form editor' }))
    .getAllByRole('button', { name: /^Edit / })
    .map((b) => b.getAttribute('aria-label')!.replace(/^Edit /, ''))

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('starts from the event template', () => {
    render(<App />)
    expect(screen.getByLabelText('Form title')).toHaveValue('Frontend meetup — Rome, 14 November')
    expect(cardLabels()[0]).toBe('Full name')
  })

  it('adds a field after the selected one, edits it from the inspector, and undoes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Edit Full name' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Add a field' })).getByRole('button', { name: /Yes \/ no/ }))
    expect(cardLabels()[1]).toBe('Untitled yes / no')

    const question = within(screen.getByRole('complementary', { name: 'Properties' })).getByLabelText('Question')
    await user.clear(question)
    await user.type(question, 'Coming with a friend?')
    expect(cardLabels()[1]).toBe('Coming with a friend?')

    // Typing is one undo step, adding the field another.
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(cardLabels()[1]).toBe('Untitled yes / no')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(cardLabels()).not.toContain('Untitled yes / no')
  })

  it('moves and deletes fields with the card buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Move Email up' }))
    expect(cardLabels().slice(0, 2)).toEqual(['Email', 'Full name'])
    await user.click(screen.getByRole('button', { name: 'Delete Email' }))
    expect(cardLabels()).not.toContain('Email')
  })

  it('keeps the draft across reloads', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Delete Email' }))
    unmount()

    render(<App />)
    expect(cardLabels()).not.toContain('Email')
  })
})
