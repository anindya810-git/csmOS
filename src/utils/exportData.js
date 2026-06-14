export async function exportToExcel(filename, columns, rows) {
  const xlsx = await import('xlsx');
  const { utils, writeFile } = xlsx;
  const ws = utils.json_to_sheet(rows, { header: columns.map(c => c.key) });
  // Set column headers to human-readable labels
  if (ws['!ref']) {
    const range = utils.decode_range(ws['!ref']);
    columns.forEach((col, idx) => {
      const cellAddr = utils.encode_cell({ r: 0, c: idx });
      if (ws[cellAddr]) ws[cellAddr].v = col.label;
    });
  }
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Data');
  writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPdf(filename, columns, rows) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
  doc.setFontSize(14);
  doc.text(filename, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 21);
  autoTable(doc, {
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => r[c.key] ?? '')),
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [14, 164, 126], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    margin: { left: 14, right: 14 },
  });
  doc.save(`${filename}.pdf`);
}
