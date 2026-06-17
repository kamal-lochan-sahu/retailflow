import PDFDocument from 'pdfkit'

export const createGSTInvoice = (saleData, shopSettings) => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))

    const { shop } = shopSettings
    const { billNumber, items, subtotal, discountAmount, gstAmount,
            totalAmount, customer, createdAt, isGstBill } = saleData

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(shop.name, { align: 'center' })
    doc.fontSize(10).font('Helvetica').text(shop.address || '', { align: 'center' })
    doc.text(`GSTIN: ${shop.gstin || 'N/A'} | Ph: ${shop.phone || ''}`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' })
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
    doc.moveDown(0.5)

    // Bill info + customer
    doc.fontSize(10).font('Helvetica')
    const left = doc.x
    doc.text(`Invoice No: ${billNumber}`, left, doc.y, { continued: false })
    doc.text(`Date: ${new Date(createdAt).toLocaleDateString('en-IN')}`)
    if (customer) {
      doc.text(`Bill To: ${customer.name}`)
      if (customer.phone) doc.text(`Phone: ${customer.phone}`)
      if (customer.gstin) doc.text(`GSTIN: ${customer.gstin}`)
    }
    doc.moveDown()

    // Items table header
    const cols = { sno:40, item:180, qty:60, rate:80, disc:60, tax:60, total:70 }
    let y = doc.y
    doc.font('Helvetica-Bold').fontSize(9)
    doc.rect(40, y, 515, 20).fill('#e5e7eb')
    doc.fillColor('#000')
    doc.text('#',       40+2, y+5, { width: cols.sno })
    doc.text('Item',   100,   y+5, { width: cols.item })
    doc.text('Qty',    280,   y+5, { width: cols.qty,   align:'right' })
    doc.text('Rate',   340,   y+5, { width: cols.rate,  align:'right' })
    doc.text('Disc',   420,   y+5, { width: cols.disc,  align:'right' })
    doc.text('GST%',   480,   y+5, { width: cols.tax,   align:'right' })
    doc.text('Total',  500,   y+5, { width: cols.total, align:'right' })
    y += 22; doc.font('Helvetica').fontSize(9)

    items.forEach((item, i) => {
      doc.text(`${i+1}`,          42,    y, { width: 20 })
      doc.text(item.name.substring(0,28), 100, y, { width: 175 })
      doc.text(`${item.quantity}`, 280,  y, { width:55,  align:'right' })
      doc.text(`${item.sellingPrice}`,340,y, { width:75,  align:'right' })
      doc.text(`${item.discount||0}`,420, y, { width:55,  align:'right' })
      doc.text(`${item.gstPercent}%`,480, y, { width:55,  align:'right' })
      doc.text(`${item.total.toFixed(2)}`,500,y,{ width:55, align:'right' })
      y += 18
    })

    doc.moveTo(40, y).lineTo(555, y).stroke()
    y += 10

    // Totals
    const totRow = (label, val, bold=false) => {
      if (bold) doc.font('Helvetica-Bold')
      doc.text(label, 350, y, { width:140, align:'right', continued: true })
      doc.text(`₹ ${parseFloat(val).toFixed(2)}`, { width:65, align:'right' })
      if (bold) doc.font('Helvetica')
      y += 16
    }

    totRow('Subtotal:', subtotal)
    if (discountAmount) totRow('Discount:', `-${discountAmount}`)
    if (gstAmount) {
      totRow('CGST:', (gstAmount/2).toFixed(2))
      totRow('SGST:', (gstAmount/2).toFixed(2))
    }
    totRow('GRAND TOTAL:', totalAmount, true)

    doc.moveDown(2)
    doc.fontSize(8).text('This is a computer generated invoice.', { align:'center' })
    doc.end()
  })
}
