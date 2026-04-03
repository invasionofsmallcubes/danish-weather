import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const APPOINTMENTS_KEY = 'appointments'
const PASSWORD_HASH = 'calendar2026'

interface Appointment {
  id: string
  title: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  fullDay: boolean
  author: 'Kasia' | 'Emanuele'
  createdAt: string
}

interface KVNamespace {
  get(key: string, options?: { type: 'text' | 'json' }): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

async function getAppointments(): Promise<Appointment[]> {
  try {
    const cf = getCloudflareContext()
    const kv = (cf.env as any).APPOINTMENTS as KVNamespace
    const data = await kv.get(APPOINTMENTS_KEY, 'json')
    return (data as Appointment[]) || []
  } catch (err) {
    console.error('Failed to get appointments from KV:', err)
    return []
  }
}

async function saveAppointments(appointments: Appointment[]): Promise<void> {
  const cf = getCloudflareContext()
  const kv = (cf.env as any).APPOINTMENTS as KVNamespace
  await kv.put(APPOINTMENTS_KEY, JSON.stringify(appointments))
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const year = parseInt(searchParams.get('year') || '0')
  const month = parseInt(searchParams.get('month') || '0')

  const allAppointments = await getAppointments()

  let filtered = allAppointments
  if (year && month) {
    filtered = allAppointments.filter((apt) => {
      const startParts = apt.startDate.split('-')
      const aptYear = parseInt(startParts[0])
      const aptMonth = parseInt(startParts[1])
      return aptYear === year && aptMonth === month
    })
  }

  return NextResponse.json({ appointments: filtered })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { title, startDate, endDate, startTime, endTime, fullDay, author, password } = body

    if (password !== PASSWORD_HASH) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const appointments = await getAppointments()

    const newAppointment: Appointment = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      title,
      startDate,
      endDate,
      startTime: fullDay ? '' : (startTime || '09:00'),
      endTime: fullDay ? '' : (endTime || '10:00'),
      fullDay: !!fullDay,
      author: author === 'Emanuele' ? 'Emanuele' : 'Kasia',
      createdAt: new Date().toISOString(),
    }

    appointments.push(newAppointment)
    await saveAppointments(appointments)

    return NextResponse.json({ appointment: newAppointment })
  } catch (err) {
    console.error('Failed to create appointment:', err)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}