export const exportTableToExcel = (
  dates: string[],
  portfolios: Array<{ name: string; currency: string }>,
  tableData: any[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
): void => {
  // Build header rows
  const headers: string[][] = [
    // First row: Date + Portfolio names (spanning 2 columns each) + Total (spanning 2 columns) + Comment
    ['Date', ...portfolios.flatMap((b) => [b.name, '']), 'Total', '', 'Comment'],
    // Second row: Value/Cash sub-headers
    ['', ...portfolios.flatMap(() => ['Value', 'Cash']), 'Value', 'Cash', ''],
  ];

  // Build data rows
  const dataRows = tableData.map((row) => {
    const cells: (string | number)[] = [row.date];

    // Add portfolio values and cash
    portfolios.forEach((portfolio) => {
      cells.push(row[`${portfolio.name}_value`] || 0);
      cells.push(row[`${portfolio.name}_cash`] || 0);
    });

    // Add totals
    cells.push(row.totalValue || 0);
    cells.push(row.totalCash || 0);

    // Add comment
    cells.push(row.comment || '');

    return cells;
  });

  // Combine headers and data
  const allRows = [...headers, ...dataRows];

  // Convert to TSV format (tab-separated values)
  const tsv = allRows.map((row) => row.map((cell) => String(cell)).join('\t')).join('\n');

  // Copy to clipboard
  navigator.clipboard.writeText(tsv).then(
    () => {
      if (onSuccess) {
        onSuccess();
      }
    },
    (err) => {
      console.error('Failed to copy to clipboard:', err);
      if (onError) {
        onError(err instanceof Error ? err : new Error('Failed to copy to clipboard'));
      }
    }
  );
};
