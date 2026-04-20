import { useCallback } from 'react';
import * as XLSX from 'xlsx';

export function useExportExcel() {
  const exportToExcel = useCallback(<T extends Record<string, unknown>>(
    data: T[],
    columns: { key: string; label: string }[],
    filename: string
  ) => {
    const rows = data.map(item =>
      columns.reduce((row, col) => {
        row[col.label] = item[col.key] ?? '';
        return row;
      }, {} as Record<string, unknown>)
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }, []);

  return { exportToExcel };
}
