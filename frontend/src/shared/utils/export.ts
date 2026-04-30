export function exportRowsToCsv<T extends Record<string, unknown>>(rows: T[], filename: string) {
  if (rows.length === 0) {
    return
  }
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? '')
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportRowsToExcel<T extends Record<string, unknown>>(rows: T[], filename: string) {
  if (rows.length === 0) {
    return
  }
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
