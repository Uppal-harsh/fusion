import { getAllHistory } from '@/lib/server/history-db'
import { auth } from '@/auth'
import { logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

function toCsv(rows: Awaited<ReturnType<typeof getAllHistory>>) {
  const header = [
    'id',
    'createdAt',
    'taskType',
    'topModel',
    'confidence',
    'responseCount',
    'totalTokens',
    'totalLatencyMs',
    'query',
    'synthesizedAnswer',
  ]
  const body = rows.map((row) => {
    const values = [
      row.id,
      row.createdAt,
      row.taskType,
      row.topModel,
      String(Math.round(row.confidence)),
      String(row.benchmark.responseCount),
      String(row.benchmark.totalTokens ?? 0),
      String(row.benchmark.totalLatencyMs ?? 0),
      row.query,
      row.synthesizedAnswer,
    ]
    return values
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  })

  return [header.join(','), ...body].join('\n')
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'history_export_unauthorized',
      route: '/api/history/export',
      statusCode: 401,
    })

    return new Response(
      JSON.stringify(
        {
          error: 'Unauthorized. Please sign in with Google.',
        },
        null,
        2
      ),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  }

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') || 'json').toLowerCase()
  const userEmail = session.user.email.trim().toLowerCase()
  const rows = await getAllHistory(userEmail)

  await logBackendEvent({
    userEmail,
    eventType: 'history_exported',
    route: '/api/history/export',
    statusCode: 200,
    metadata: {
      format,
      count: rows.length,
    },
  })

  if (format === 'csv') {
    return new Response(toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fusion-history.csv"',
      },
    })
  }

  return new Response(JSON.stringify({ items: rows }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fusion-history.json"',
    },
  })
}
