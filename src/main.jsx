import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, CircleCheck, Clock3, FolderKanban, ListTodo, LockKeyhole, Plus, Target, X } from 'lucide-react'
import { categories, modes, makeDay, moveDate, dateKey, parseDate, monday, dateLabel, defaultMode, timeInput, fromInput, clock, duration, focusBlocks, firstSlot, uid, seed } from './data'
import './styles.css'

const today = new Date()
const todayKey = dateKey(today)
const storageKey = 'focus-week-v1'
const shortDate = date => dateLabel(date, { day: 'numeric', month: 'short' })
const nav = [
  ['planner', 'Planner'],
  ['tasks', 'Tasks'],
  ['projects', 'Projects'],
  ['progress', 'Progress'],
]

const glyphs = {
  brand: ['10101', '01110', '11111', '01110', '10101'],
  planner: ['11111', '10001', '10101', '10001', '11111'],
  tasks: ['11011', '00000', '11011', '00000', '11011'],
  projects: ['11000', '11111', '10001', '10001', '11111'],
  progress: ['00001', '00101', '00101', '10101', '10101'],
}

function Glyph({ name }) {
  return <svg className="pixel-glyph" width="16" height="16" viewBox="0 0 5 5" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
    {glyphs[name].flatMap((row, y) => [...row].map((bit, x) => bit === '1' ? <rect key={y * 5 + x} x={x} y={y} width="1" height="1"/> : null))}
  </svg>
}

function DayInstrument({ date, mode }) {
  return <div className="day-instrument">
    <svg className="dial" viewBox="0 0 216 144" fill="none" aria-hidden="true">
      <circle cx="163" cy="72" r="108"/>
      <circle cx="163" cy="72" r="96"/>
      <path d="M45 72h20m-9-49 18 8m-18 90 18-8M89 3l10 15m-10 123 10-15"/>
      <circle className="dial-mark" cx="55" cy="72" r="3.5"/>
    </svg>
    <div className="instrument-copy"><span>SELECTED DAY</span><strong>{String(date.getDate()).padStart(2, '0')}</strong><small>{dateLabel(date, { weekday: 'long' })} / {modes[mode].short}</small></div>
  </div>
}

function initialData() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? seed(today)
  } catch {
    return seed(today)
  }
}

function Tag({ category }) {
  const item = categories[category]
  return <span className="tag">{item.label}</span>
}

function Modal({ title, close, children }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }}>
    <div className="modal-head"><h2 id="dialog-title">{title}</h2><button className="icon-btn" onClick={close} aria-label="Close dialog"><X size={19}/></button></div>
    {children}
  </dialog>
}

function Categories({ value }) {
  return <select name="category" defaultValue={value}>{Object.entries(categories).filter(([key]) => key !== 'routine').map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select>
}

function App() {
  const [data, setData] = useState(initialData)
  const [selected, setSelected] = useState(todayKey)
  const [page, setPage] = useState('planner')
  const [editor, setEditor] = useState(null)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [notice, setNotice] = useState('')
  const [showRoutine, setShowRoutine] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); setStorageError(false) }
    catch { setStorageError(true) }
  }, [data])

  const date = parseDate(selected)
  const weekStart = monday(date)
  const week = Array.from({ length: 7 }, (_, index) => moveDate(weekStart, index))
  const getDay = key => data.days[key] ?? makeDay(defaultMode(parseDate(key)))
  const day = getDay(selected)
  const blocks = [...day.blocks].sort((a, b) => a.start - b.start)
  const visibleBlocks = showRoutine ? blocks : focusBlocks({ blocks })
  const weekly = week.flatMap(value => focusBlocks(getDay(dateKey(value))))
  const planned = weekly.reduce((sum, block) => sum + block.end - block.start, 0)
  const completed = weekly.filter(block => block.done).reduce((sum, block) => sum + block.end - block.start, 0)
  const weekTasks = data.tasks.filter(task => task.date >= dateKey(week[0]) && task.date <= dateKey(week[6]))
  const upcoming = data.projects.filter(project => project.status !== 'Completed').sort((a, b) => a.date.localeCompare(b.date))
  const dayTasks = data.tasks.filter(task => task.date === selected)
  const updateDay = (key, value) => setData(previous => ({ ...previous, days: { ...previous.days, [key]: value } }))
  const updateItem = (list, value) => setData(previous => ({
    ...previous,
    [list]: previous[list].some(item => item.id === value.id)
      ? previous[list].map(item => item.id === value.id ? value : item)
      : [...previous[list], value],
  }))
  const deleteItem = (list, id) => setData(previous => ({ ...previous, [list]: previous[list].filter(item => item.id !== id) }))
  const open = (type, item) => { setError(''); setEditor({ type, item }) }
  const close = () => setEditor(null)
  const select = key => { setSelected(key); setNotice('') }
  const saveBlock = event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const { item } = editor
    const start = fromInput(values.start)
    const end = fromInput(values.end)
    const others = blocks.filter(block => block.id !== item?.id)
    if (start < 420 || end > 1260 || end <= start) {
      setError('Choose a valid time between 7:00 AM and 9:00 PM.')
      return
    }
    const conflict = others.find(block => start < block.end && end > block.start)
    if (conflict) {
      setError('This overlaps “' + conflict.title + '”. Choose a free time.')
      return
    }
    if (!values.title.trim()) { setError('Enter a title.'); return }
    updateDay(selected, { ...day, blocks: [...others, { ...values, title: values.title.trim(), start, end, id: item?.id ?? uid(), done: item?.done ?? false }] })
    close()
  }

  function moveBlock(payload, target) {
    const sourceDay = getDay(payload.date)
    const block = sourceDay.blocks.find(value => value.id === payload.id && value.category !== 'routine')
    if (!block || payload.date === target) return
    const targetDay = getDay(target)
    const length = block.end - block.start
    const sameTimeFree = !targetDay.blocks.some(value => block.start < value.end && block.end > value.start)
    const start = sameTimeFree ? block.start : firstSlot(targetDay.blocks, length)
    if (start === null) { setNotice('There is no open slot long enough on that day.'); return }
    setData(previous => ({ ...previous, days: {
      ...previous.days,
      [payload.date]: { ...sourceDay, blocks: sourceDay.blocks.filter(value => value.id !== block.id) },
      [target]: { ...targetDay, blocks: [...targetDay.blocks, { ...block, id: uid(), start, end: start + length }] },
    } }))
    setSelected(target)
    setNotice('Moved to ' + shortDate(parseDate(target)) + ' at ' + clock(start) + '.')
  }

  const saveItem = event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const item = editor.item
    if (!values.title.trim()) { setError('Enter a title.'); return }
    const common = { ...values, title: values.title.trim(), id: item?.id ?? uid() }
    if (editor.type === 'task') {
      updateItem('tasks', { ...common, done: item?.done ?? false })
    } else {
      const { checklist, ...project } = common
      const existing = [...(item?.items ?? [])]
      const items = checklist.split('\n').map(line => line.trim()).filter(Boolean).map(title => {
        const index = existing.findIndex(value => value.title === title)
        return index < 0 ? { id: uid(), title, done: false } : existing.splice(index, 1)[0]
      })
      updateItem('projects', { ...project, items })
    }
    close()
  }

  const taskList = tasks => tasks.length ? <ul className="check-list">{tasks.map(task =>
    <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => updateItem('tasks', { ...task, done: !task.done })}/><span className={task.done ? 'crossed' : ''}>{task.title}</span></label><button className="text-btn" onClick={() => open('task', task)} aria-label={'Edit task ' + task.title}>Edit</button></li>
  )}</ul> : <p className="empty">No tasks scheduled here.</p>

  const heading = {
    planner: ['Weekly planner', 'Make time for learning, client work, and life outside the desk.'],
    tasks: ['Tasks', 'Give each study session or client block a clear next step.'],
    projects: ['Projects & deadlines', 'Track client commitments, portfolio work, and delivery checklists.'],
    progress: ['Progress', 'See how much of your weekly plan you’ve completed.'],
  }[page]

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Glyph name="brand"/></span><strong>focus.week</strong></div>
      <nav aria-label="Workspace">{nav.map(([id, label]) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Glyph name={id}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-note"><span className="online-dot"/> Local workspace</div>
    </aside>

    <main>
      <div className="content">
        <header className="page-head">
          <div className="page-intro"><div className="eyebrow"><span>{String(nav.findIndex(([id]) => id === page) + 1).padStart(2, '0')}</span> / WORKSPACE</div><h1>{heading[0]}</h1><p>{heading[1]}</p>
          {page !== 'progress' && <button className="primary head-action" onClick={() => open({ planner: 'block', tasks: 'task', projects: 'project' }[page])}><Plus size={17}/>{ { planner: 'Add time block', tasks: 'Add task', projects: 'Add project' }[page]}</button>}</div>
          {page === 'planner' && <DayInstrument date={date} mode={day.mode}/>}
        </header>
        {storageError && <p role="alert" className="alert">This browser could not save your changes.</p>}
        {page === 'planner' && <>
          <div className="stats">
            <Stat icon={Clock3} label="Planned this week" value={duration(planned)} note="Across all focus blocks"/>
            <Stat icon={CircleCheck} label="Tasks completed" value={weekTasks.filter(task => task.done).length + ' / ' + weekTasks.length} note="This week’s checklist"/>
            <Stat icon={Target} label="Active projects" value={upcoming.length} note={upcoming[0] ? 'Next due ' + shortDate(parseDate(upcoming[0].date)) : 'No upcoming deadlines'}/>
          </div>
          <section className="panel week-panel" aria-label="Weekly calendar">
            <div className="section-head"><div><h2>Weekly calendar</h2><p>{shortDate(week[0])} – {shortDate(week[6])}, {week[6].getFullYear()}</p></div><WeekControls selected={selected} select={select}/></div>
            <div className="week-grid">{week.map(value => {
              const key = dateKey(value)
              const entry = getDay(key)
              return <button key={key} className={'day ' + (selected === key ? 'selected ' : '') + (dragging && dragging.date !== key ? 'drop-day' : '')}
                aria-label={dateLabel(value, { dateStyle: 'full' }) + ', ' + modes[entry.mode].label} aria-pressed={selected === key}
                onClick={() => select(key)} onDragOver={event => { if (dragging && dragging.date !== key) event.preventDefault() }}
                onDrop={event => { event.preventDefault(); if (dragging) moveBlock(dragging, key); setDragging(null) }}>
                <span className="weekday">{dateLabel(value, { weekday: 'short' })}</span><strong>{value.getDate()}</strong>
                <span className={'mode ' + entry.mode}><i/>{modes[entry.mode].short}</span>
              </button>
            })}</div>
          </section>
          <div className="planner-grid">
            <section className="panel agenda">
              <div className="section-head agenda-head"><div><h2>{dateLabel(date, { weekday: 'long' })}’s agenda</h2><p>{shortDate(date)} · {focusBlocks(day).filter(block => block.done).length} of {focusBlocks(day).length} focus blocks complete</p></div>
              <div className="select-wrap"><select aria-label="Day preset" value={day.mode} onChange={event => open('preset', event.target.value)}>{Object.entries(modes).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><ChevronDown size={15}/></div></div>
              <div className="routine-bar"><LockKeyhole size={15}/><span>6 AM wake · 7 AM workspace · 10 PM sleep</span><button className="text-btn" aria-expanded={showRoutine} onClick={() => setShowRoutine(!showRoutine)}>{showRoutine ? 'Hide routine' : 'Show routine'}</button></div>
              <p role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</p>
              <div className="block-list">{visibleBlocks.map(block => {
                const item = categories[block.category]
                const routine = block.category === 'routine'
                return <article className="block" key={block.id} draggable={!routine}
                  onDragStart={event => { if (!routine) { event.dataTransfer.setData('text/plain', block.title); event.dataTransfer.effectAllowed = 'move'; setDragging({ date: selected, id: block.id }) } }}
                  onDragEnd={() => setDragging(null)}>
                  <div className="block-time"><strong>{clock(block.start)}</strong><span>{clock(block.end)}</span></div>
                  <div className="block-content"><span className="block-icon">{routine ? <LockKeyhole size={15}/> : item.short}</span><div><strong className={block.done ? 'crossed' : ''}>{block.title}</strong><small>{item.label} · {duration(block.end - block.start)}</small></div>
                    {!routine && <div className="block-actions"><button className="text-btn" onClick={() => open('block', block)} aria-label={'Edit ' + block.title}>Edit</button><button className={'complete-btn ' + (block.done ? 'done' : '')} aria-label={'Complete ' + block.title} aria-pressed={block.done} onClick={() => updateDay(selected, { ...day, blocks: blocks.map(value => value.id === block.id ? { ...value, done: !value.done } : value) })}>{block.done && <Check size={15}/>}</button></div>}
                  </div>
                </article>
              })}{!visibleBlocks.length && <p className="empty">No focus blocks. Add one when you’re ready.</p>}</div>
            </section>
            <div className="side-panels">
              <section className="panel side-panel"><div className="section-head"><div><h2>Daily checklist</h2><p>Small steps for {shortDate(date)}</p></div><button className="icon-btn" onClick={() => open('task')} aria-label="Add checklist task"><Plus size={18}/></button></div>{taskList(dayTasks)}</section>
              <section className="panel side-panel"><div className="section-head"><div><h2>Upcoming deadlines</h2><p>Your next deliveries</p></div><FolderKanban size={18}/></div>{upcoming.length ? upcoming.slice(0, 3).map(project => <button className="deadline" key={project.id} onClick={() => open('project', project)}><span className="deadline-date">{shortDate(parseDate(project.date))}</span><span><strong>{project.title}</strong><small>{project.client}</small></span><ArrowRight size={15}/></button>) : <p className="empty">No upcoming deadlines.</p>}</section>
            </div>
          </div>
        </>}
        {page === 'tasks' && <section className="panel listing">
          <div className="section-head"><div><h2>All tasks</h2><p>{data.tasks.filter(task => task.done).length} of {data.tasks.length} complete</p></div></div>
          {data.tasks.length ? [...new Set(data.tasks.map(task => task.date))].sort().map(key => <div className="task-group" key={key}><h3>{key === todayKey ? 'Today · ' : ''}{shortDate(parseDate(key))}</h3>{taskList(data.tasks.filter(task => task.date === key))}</div>) : <p className="empty">Add a task to start your checklist.</p>}
        </section>}
        {page === 'projects' && <div className="project-grid">{[...data.projects].sort((a, b) => a.date.localeCompare(b.date)).map(project => <section className="panel side-panel" key={project.id}>
          <div className="section-head"><div><h2>{project.title}</h2><p>{project.client || 'Personal project'} · Due {shortDate(parseDate(project.date))}</p></div><button className="text-btn" onClick={() => open('project', project)}>Edit</button></div>
          <span className="tag project-status">{project.status}</span>
          <ul className="check-list">{project.items.map(item => <li key={item.id}><label><input type="checkbox" checked={item.done} onChange={() => updateItem('projects', { ...project, items: project.items.map(value => value.id === item.id ? { ...value, done: !value.done } : value) })}/><span className={item.done ? 'crossed' : ''}>{item.title}</span></label></li>)}</ul>
          {!project.items.length && <p className="empty">No checklist items yet.</p>}
        </section>)}{!data.projects.length && <p className="empty">Add a project to track its deadline and checklist.</p>}</div>}
        {page === 'progress' && <>
          <section className="panel week-panel"><div className="section-head"><div><h2>Weekly activity</h2><p>{shortDate(week[0])} – {shortDate(week[6])}, {week[6].getFullYear()}</p></div><WeekControls selected={selected} select={select}/></div>
            <div className="stats"><Stat icon={Activity} label="Focus time completed" value={duration(completed)} note={'Of ' + duration(planned) + ' planned'}/><Stat icon={CircleCheck} label="Blocks complete" value={weekly.filter(block => block.done).length + ' / ' + weekly.length} note="Across the selected week"/><Stat icon={ListTodo} label="Tasks complete" value={weekTasks.filter(task => task.done).length + ' / ' + weekTasks.length} note="Across the selected week"/></div>
          </section>
          <section className="panel listing progress-panel"><div className="section-head"><div><h2>Time by activity</h2><p>Completed time out of planned time</p></div></div>
            {Object.entries(categories).filter(([key]) => key !== 'routine').map(([key, item]) => {
              const matching = weekly.filter(block => block.category === key)
              const total = matching.reduce((sum, block) => sum + block.end - block.start, 0)
              const done = matching.filter(block => block.done).reduce((sum, block) => sum + block.end - block.start, 0)
              return <div className="metric" key={key}><div><Tag category={key}/><strong>{duration(done)} / {duration(total)}</strong></div><progress max={total || 1} value={done} aria-label={item.label + ' completed time'}/></div>
            })}
          </section>
        </>}
      </div>
    </main>
    {editor?.type === 'preset' && <Modal title="Switch day preset?" close={close}><p className="modal-copy">Apply {modes[editor.item].label} to {shortDate(date)}. This replaces the day’s blocks and their completion marks.</p><div className="form-actions"><button className="secondary" onClick={close}>Cancel</button><button className="primary" onClick={() => { updateDay(selected, makeDay(editor.item)); close() }}>Apply preset</button></div></Modal>}
    {editor?.type === 'block' && <Modal title={editor.item ? 'Edit time block' : 'Add time block'} close={close}>
      <form onSubmit={saveBlock}><label>Title<input name="title" required maxLength={100} defaultValue={editor.item?.title}/></label>
      <label>Activity<Categories value={editor.item?.category ?? 'c'}/></label>
      <div className="form-grid"><label>Start time<input name="start" type="time" required defaultValue={timeInput(editor.item?.start ?? firstSlot(blocks) ?? 420)}/></label><label>End time<input name="end" type="time" required defaultValue={timeInput(editor.item?.end ?? (firstSlot(blocks) ?? 420) + 30)}/></label></div>
      {editor.item && <div className="move-controls"><span>Move to an adjacent day</span><button className="icon-btn" type="button" aria-label="Move to previous day" onClick={() => { moveBlock({ date: selected, id: editor.item.id }, dateKey(moveDate(date, -1))); close() }}><ArrowUp size={17}/></button><button className="icon-btn" type="button" aria-label="Move to next day" onClick={() => { moveBlock({ date: selected, id: editor.item.id }, dateKey(moveDate(date, 1))); close() }}><ArrowDown size={17}/></button></div>}
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="form-actions">{editor.item && <button type="button" className="danger" onClick={() => { updateDay(selected, { ...day, blocks: blocks.filter(block => block.id !== editor.item.id) }); close() }}>Delete block</button>}<button className="primary" type="submit">Save block</button></div></form>
    </Modal>}
    {['task', 'project'].includes(editor?.type) && <Modal title={(editor.item ? 'Edit ' : 'Add ') + editor.type} close={close}>
      <form onSubmit={saveItem}><label>Title<input name="title" required maxLength={120} defaultValue={editor.item?.title}/></label>
      {editor.type === 'task' ? <label>Activity<Categories value={editor.item?.category ?? 'c'}/></label> : <label>Client or project owner<input name="client" maxLength={80} defaultValue={editor.item?.client}/></label>}
      <label>{editor.type === 'task' ? 'Scheduled date' : 'Due date'}<input name="date" type="date" required defaultValue={editor.item?.date ?? selected}/></label>
      {editor.type === 'project' && <><label>Status<select name="status" defaultValue={editor.item?.status ?? 'Planned'}>{['Planned', 'In progress', 'Completed'].map(status => <option key={status}>{status}</option>)}</select></label><label>Checklist (one item per line)<textarea name="checklist" rows={4} defaultValue={editor.item?.items.map(item => item.title).join('\n')}/></label></>}
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="form-actions">{editor.item && <button className="danger" type="button" onClick={() => { deleteItem(editor.type === 'task' ? 'tasks' : 'projects', editor.item.id); close() }}>Delete {editor.type}</button>}<button className="primary" type="submit">Save {editor.type}</button></div></form>
    </Modal>}
  </div>
}

function Stat({ icon: Icon, label, value, note }) {
  return <article className="stat"><div className="stat-icon"><Icon size={16}/></div><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>
}

function WeekControls({ selected, select }) {
  return <div className="week-controls"><button className="icon-btn" aria-label="Previous week" onClick={() => select(dateKey(moveDate(parseDate(selected), -7)))}><ArrowLeft size={17}/></button><button className="secondary" onClick={() => select(todayKey)}>Today</button><button className="icon-btn" aria-label="Next week" onClick={() => select(dateKey(moveDate(parseDate(selected), 7)))}><ArrowRight size={17}/></button></div>
}

createRoot(document.getElementById('root')).render(<App/>)
