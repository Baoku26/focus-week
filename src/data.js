export const categories = {
  c: { label: 'C Programming', short: 'C', color: '#5749ce', pale: '#efedff' },
  ux: { label: 'UI/UX Design', short: 'UX', color: '#087d70', pale: '#e4f7f1' },
  art: { label: 'Banner Art', short: 'BA', color: '#a25619', pale: '#fff1e3' },
  market: { label: 'Market Study', short: 'MS', color: '#a73674', pale: '#fceaf5' },
  review: { label: 'Daily Review', short: 'DR', color: '#285eb0', pale: '#e9f1ff' },
  routine: { label: 'Protected Routine', short: 'PR', color: '#59657b', pale: '#eef0f5' },
}

export const modes = {
  normal: { label: 'Normal Day', short: 'Normal' },
  client: { label: 'Client Deadline Day', short: 'Client' },
  rest: { label: 'Light / Rest Day', short: 'Light / Rest' },
}

const routines = [
  [360, 420, 'Wake up · breakfast & prep'],
  [540, 555, 'Morning break'],
  [720, 780, 'Lunch & reset'],
  [900, 915, 'Afternoon break'],
  [1080, 1140, 'Dinner & downtime'],
  [1260, 1320, 'Wind down'],
  [1320, 1800, 'Sleep · until 6 AM'],
]

const common = [
  [1020, 1050, 'market', 'Market research & paper trading'],
  [1170, 1200, 'review', 'Daily review & tomorrow’s plan'],
]

const presets = {
  normal: [
    [420, 540, 'c', 'C Programming · K&R study'],
    [555, 675, 'c', 'C exercises & mini project'],
    [780, 900, 'ux', 'UI/UX learning & Figma'],
    [915, 1005, 'ux', 'Figma practice & design critique'],
    [1050, 1080, 'art', 'Banner art · concepts'],
    [1200, 1260, 'art', 'Banner art · portfolio'],
    [675, 705, 'art', 'Banner art · client revisions'],
  ],
  client: [
    [420, 510, 'c', 'C Programming · K&R essentials'],
    [555, 675, 'art', 'Client banner · design sprint'],
    [780, 900, 'art', 'Client banner · production'],
    [915, 1005, 'ux', 'UI/UX learning & Figma'],
    [1050, 1080, 'ux', 'Figma practice'],
    [1140, 1170, 'art', 'Client banner · feedback'],
    [1200, 1260, 'art', 'Client banner · final delivery'],
    [675, 705, 'art', 'Client banner · variations'],
  ],
  rest: [
    [420, 450, 'c', 'Light C practice'],
    [780, 810, 'ux', 'Figma exploration'],
  ],
}

export function makeDay(mode) {
  return {
    mode,
    blocks: [
      ...routines.map(([start, end, title]) => [start, end, 'routine', title]),
      ...presets[mode], ...common,
    ].map(([start, end, category, title], index) => ({
      id: 'preset-' + index, start, end, category, title, done: false,
    })),
  }
}

export const moveDate = (date, amount) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export const dateKey = date => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
].join('-')

export const parseDate = key => new Date(key + 'T12:00:00')
export const monday = date => moveDate(date, -((date.getDay() + 6) % 7))
export const dateLabel = (date, options) => date.toLocaleDateString('en-GB', options)
export const defaultMode = date => [0, 6].includes(date.getDay()) ? 'rest' : 'normal'
export const timeInput = value => String(Math.floor(value / 60) % 24).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
export const fromInput = value => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}
export const clock = value => {
  const hour = Math.floor(value / 60) % 24
  return (hour % 12 || 12) + ':' + String(value % 60).padStart(2, '0') + (hour < 12 ? ' AM' : ' PM')
}
export const duration = value => value >= 60 ? Math.floor(value / 60) + 'h' + (value % 60 ? ' ' + value % 60 + 'm' : '') : value + 'm'
export const focusBlocks = day => day.blocks.filter(block => block.category !== 'routine')
export const uid = () => crypto.randomUUID()

export function firstSlot(blocks, length = 30, from = 420) {
  let start = from
  for (const block of [...blocks].sort((a, b) => a.start - b.start)) {
    if (block.end <= start) continue
    if (start + length <= block.start) break
    start = block.end
  }
  return start + length <= 1260 ? start : null
}

export function seed(today) {
  const friday = moveDate(monday(today), 4)
  return {
    days: { [dateKey(friday)]: makeDay('client') },
    tasks: [
      { id: 'task-1', title: 'Read K&R Chapter 1 and annotate examples', category: 'c', date: dateKey(today), done: false },
      { id: 'task-2', title: 'Solve two C loop exercises', category: 'c', date: dateKey(today), done: false },
      { id: 'task-3', title: 'Build a Figma auto-layout card', category: 'ux', date: dateKey(today), done: false },
      { id: 'task-4', title: 'Sketch three banner directions', category: 'art', date: dateKey(today), done: false },
      { id: 'task-5', title: 'Log one paper trade and its rationale', category: 'market', date: dateKey(today), done: false },
    ],
    projects: [
      { id: 'project-1', title: 'Launch campaign banners', client: 'Studio North', date: dateKey(moveDate(today, 2)), status: 'In progress', items: [
        { id: 'check-1', title: 'Confirm sizes and creative brief', done: true },
        { id: 'check-2', title: 'Share first-round concepts', done: false },
        { id: 'check-3', title: 'Export and deliver final files', done: false },
      ] },
      { id: 'project-2', title: 'Portfolio banner collection', client: 'Personal project', date: dateKey(moveDate(today, 7)), status: 'Planned', items: [
        { id: 'check-4', title: 'Choose three pieces to refine', done: false },
        { id: 'check-5', title: 'Write short project notes', done: false },
      ] },
    ],
  }
}
