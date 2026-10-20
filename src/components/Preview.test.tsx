import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Preview from './Preview'
import { TEMPLATES } from '../schema/templates'

describe('Preview', () => {
  it('reveals follow-up questions as the rules match', async () => {
    const user = userEvent.setup()
    render(<Preview schema={TEMPLATES[0].schema} />)

    expect(screen.queryByLabelText('Dietary needs')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    await user.selectOptions(screen.getByLabelText('Dietary needs'), 'Other')
    expect(screen.getByLabelText(/Tell us more/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    expect(screen.queryByLabelText(/Tell us more/)).not.toBeInTheDocument()
  })

  it('blocks an incomplete submission and focuses the first problem', async () => {
    const user = userEvent.setup()
    render(<Preview schema={TEMPLATES[0].schema} />)

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getAllByText('This field is required.')).toHaveLength(3)
    expect(screen.getByLabelText(/Full name/)).toHaveFocus()
    expect(screen.getByLabelText(/Full name/)).toHaveAccessibleDescription('This field is required.')
  })

  it('shows what would be sent', async () => {
    const user = userEvent.setup()
    render(<Preview schema={TEMPLATES[0].schema} />)

    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.com')
    await user.click(screen.getByRole('checkbox', { name: 'Morning talks' }))
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(screen.getByRole('status')).toHaveTextContent('"name": "Ada Lovelace"')
    expect(screen.getByRole('status')).toHaveTextContent('"sessions": [ "talks" ]')
  })
})
