import { getAllHistory } from '@/lib/server/history-db'

export const runtime = 'nodejs'

function toCsv(rows: Awaited<ReturnType<typeof getAllHistory>>) {
  const header = ['id', 'createdAt', 'taskType', 'topModel', 'confidence', 'query', 'synthesizedAnswer']
  const body = rows.map((row) => {
    const values = [
      row.id,
      row.createdAt,
      row.taskType,
      row.topModel,
      String(Math.round(row.confidence)),
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
  const url = new URL(request.url)
  const format = (url.searchParams.get('format') || 'json').toLowerCase()
  const rows = await getAllHistory()

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
