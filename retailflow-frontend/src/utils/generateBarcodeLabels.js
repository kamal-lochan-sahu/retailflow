import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'
import { formatINR } from './formatCurrency.js'

// Renders one barcode to an offscreen canvas and returns a PNG data URL.
// CODE128 is used (not EAN13) because product.barcode is free text here —
// it isn't guaranteed to be a valid 13-digit EAN, and CODE128 encodes any
// alphanumeric value without throwing.
function barcodeDataUrl(value) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 50,
  })
  return canvas.toDataURL('image/png')
}

// items: [{ name, barcode, sellingPrice, qty }]
// Lays out labels in a simple 3-column grid on A4 and triggers a download.
export function generateBarcodeLabelsPDF(items) {
  const labels = []
  items.forEach(item => {
    if (!item.barcode) return
    for (let i = 0; i < (item.qty || 1); i++) labels.push(item)
  })
  if (labels.length === 0) return false

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, pageH = 297
  const cols = 3, marginX = 8, marginY = 10
  const cellW = (pageW - marginX * 2) / cols
  const cellH = 28
  const rowsPerPage = Math.floor((pageH - marginY * 2) / cellH)
  const perPage = cols * rowsPerPage

  labels.forEach((item, i) => {
    const posOnPage = i % perPage
    if (i > 0 && posOnPage === 0) doc.addPage()

    const col = posOnPage % cols
    const row = Math.floor(posOnPage / cols)
    const x = marginX + col * cellW
    const y = marginY + row * cellH

    doc.setDrawColor(200).rect(x + 1, y + 1, cellW - 2, cellH - 2)
    doc.setFontSize(8).setFont(undefined, 'normal')
    doc.text(String(item.name).slice(0, 28), x + cellW / 2, y + 6, { align: 'center' })

    const png = barcodeDataUrl(item.barcode)
    const barcodeW = cellW - 8
    doc.addImage(png, 'PNG', x + 4, y + 8, barcodeW, 12)

    doc.setFontSize(7)
    doc.text(String(item.barcode), x + cellW / 2, y + 22, { align: 'center' })
    doc.setFontSize(9).setFont(undefined, 'bold')
    doc.text(formatINR(item.sellingPrice), x + cellW / 2, y + 26.5, { align: 'center' })
  })

  doc.save(`barcode-labels-${Date.now()}.pdf`)
  return true
}
