import { SCHEMA_VERSION, type Field, type FormSchema } from './types'

// Hand-written starting points. Ids are readable on purpose: they show up in
// the exported JSON and in the conditions.

const field = (f: Partial<Field> & Pick<Field, 'id' | 'type' | 'label'>): Field => ({
  help: '',
  placeholder: '',
  required: false,
  options: [],
  validation: {},
  condition: null,
  ...f,
})

const opts = (...labels: [string, string][]) => labels.map(([id, label]) => ({ id, label }))

export interface Template {
  id: string
  name: string
  blurb: string
  schema: FormSchema
}

export const TEMPLATES: Template[] = [
  {
    id: 'event',
    name: 'Event registration',
    blurb: 'Contact details, a day pick and a dietary question that only shows up when it matters.',
    schema: {
      version: SCHEMA_VERSION,
      title: 'Frontend meetup — Rome, 14 November',
      description: 'Free entry, places are limited. We will send the details by email the week before.',
      fields: [
        field({ id: 'name', type: 'short-text', label: 'Full name', required: true, placeholder: 'Ada Lovelace' }),
        field({ id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'ada@example.com' }),
        field({
          id: 'sessions',
          type: 'multiple-choice',
          label: 'Which sessions will you attend?',
          required: true,
          options: opts(['talks', 'Morning talks'], ['workshop', 'Afternoon workshop'], ['dinner', 'Dinner']),
          validation: { min: 1 },
        }),
        field({
          id: 'diet',
          type: 'dropdown',
          label: 'Dietary needs',
          help: 'So the kitchen can plan ahead.',
          options: opts(['none', 'None'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['gluten', 'Gluten-free'], ['other', 'Other']),
          condition: { fieldId: 'sessions', operator: 'includes', value: 'dinner' },
        }),
        field({
          id: 'diet_other',
          type: 'short-text',
          label: 'Tell us more',
          required: true,
          condition: { fieldId: 'diet', operator: 'equals', value: 'other' },
        }),
        field({ id: 'notes', type: 'long-text', label: 'Anything else?', validation: { maxLength: 300 } }),
      ],
    },
  },
  {
    id: 'job',
    name: 'Job application',
    blurb: 'Profile, experience and a portfolio link that is asked only to designers.',
    schema: {
      version: SCHEMA_VERSION,
      title: 'Apply: frontend developer',
      description: 'A short form, it takes about three minutes.',
      fields: [
        field({ id: 'about', type: 'section', label: 'About you' }),
        field({ id: 'name', type: 'short-text', label: 'Full name', required: true }),
        field({ id: 'email', type: 'email', label: 'Email', required: true }),
        field({
          id: 'role',
          type: 'single-choice',
          label: 'Role',
          required: true,
          options: opts(['dev', 'Developer'], ['designer', 'Designer'], ['both', 'A bit of both']),
        }),
        field({
          id: 'portfolio',
          type: 'short-text',
          label: 'Portfolio link',
          placeholder: 'https://',
          required: true,
          condition: { fieldId: 'role', operator: 'not-equals', value: 'dev' },
        }),
        field({ id: 'experience', type: 'section', label: 'Experience' }),
        field({ id: 'years', type: 'number', label: 'Years of experience', required: true, validation: { min: 0, max: 50 } }),
        field({ id: 'remote', type: 'yes-no', label: 'Are you open to working from our Milan office?', required: true }),
        field({
          id: 'start',
          type: 'date',
          label: 'Earliest start date',
          condition: { fieldId: 'remote', operator: 'equals', value: 'yes' },
        }),
        field({
          id: 'letter',
          type: 'long-text',
          label: 'Why us?',
          help: 'A few lines are enough.',
          validation: { minLength: 30, maxLength: 1000 },
        }),
      ],
    },
  },
]
