'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  title: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  fullDay: boolean
  author: 'Kasia' | 'Emanuele'
}

export function Calendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    fullDay: false,
    author: 'Kasia' as 'Kasia' | 'Emanuele',
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchAppointments()
  }, [currentMonth])

  async function fetchAppointments() {
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const res = await fetch(`/api/appointments?year=${year}&month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password }),
      })

      if (res.ok) {
        setShowForm(false)
        setPassword('')
        setFormData({
          title: '',
          startDate: '',
          endDate: '',
          startTime: '09:00',
          endTime: '10:00',
          fullDay: false,
          author: 'Kasia',
        })
        fetchAppointments()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create appointment')
      }
    } catch (err) {
      setError('Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  function getAppointmentsForDay(day: number) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.filter((apt) => {
      const start = apt.startDate
      const end = apt.endDate
      return dateStr >= start && dateStr <= end
    })
  }

  function formatTime(apt: Appointment) {
    if (apt.fullDay) return 'All day'
    return `${apt.startTime} - ${apt.endTime}`
  }

  const days = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Calendar</h2>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Appointment
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100"
        >
          ← Prev
        </button>
        <span className="font-medium text-gray-700">{monthName}</span>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayAppointments = day ? getAppointmentsForDay(day) : []
          const isToday = day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear()

          return (
            <div
              key={idx}
              className={`min-h-20 border border-gray-200 p-1 ${day ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'bg-blue-50' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`truncate rounded px-1 py-0.5 text-xs ${
                          apt.author === 'Kasia' ? 'bg-pink-100 text-pink-800' : 'bg-cyan-100 text-cyan-800'
                        }`}
                        title={`${apt.title} (${formatTime(apt)})`}
                      >
                        {apt.title}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayAppointments.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">New Appointment</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              {!formData.fullDay && (
                <div className="mb-4 flex gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.fullDay}
                    onChange={(e) => setFormData({ ...formData, fullDay: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Full day</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Author</label>
                <select
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value as 'Kasia' | 'Emanuele' })}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="Kasia">Kasia</option>
                  <option value="Emanuele">Emanuele</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>

              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setError('')
                  }}
                  className="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}