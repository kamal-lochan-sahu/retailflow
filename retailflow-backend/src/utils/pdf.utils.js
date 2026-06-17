import PDFDocument from 'pdfkit'

export const createBillPDF = (saleData, shopSettings) => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ size: [227, 600], margin: 10 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))

    const { billNumber, items, subtotal, discountAmount, gstAmount, totalAmount,
            paymentMode, payments, customer, createdAt } = saleData
    const { shop } = shopSettings

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text(shop.name, { align: 'center' })
    if (shop.address) doc.fontSize(8).font('Helvetica').text(shop.address, { align: 'center' })
    if (shop.phone)   doc.text(`Ph: ${shop.phone}`, { align: 'center' })
    if (shop.gstin)   doc.text(`GSTIN: ${shop.gstin}`, { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(10, doc.y).lineTo(217, doc.y).stroke()

    // Bill info
    doc.moveDown(0.3).fontSize(8)
    doc.text(`Bill No: ${billNumber}`)
    doc.text(`Date: ${new Date(createdAt).toLocaleString('en-IN')}`)
    if (customer) doc.text(`Customer: ${customer.name} | ${customer.phone}`)
    doc.moveTo(10, doc.y).lineTo(217, doc.y).stroke().moveDown(0.3)

    // Items header
    doc.font('Helvetica-Bold')
    doc.text('Item', 10, doc.y, { width: 120, continued: true })
    doc.text('Qty', { width: 30, continued: true, align: 'right' })
    doc.text('Price', { width: 40, continued: true, align: 'right' })
    doc.text('Total', { width: 45, align: 'right' })
    doc.font('Helvetica')

    items.forEach(item => {
      doc.text(item.name.substring(0,22), 10, doc.y, { width: 120, continued: true })
      doc.text(`${item.quantity}`, { width: 30, continued: true, align: 'right' })
      doc.text(`${item.sellingPrice}`, { width: 40, continued: true, align: 'right' })
      doc.text(`${item.total}`, { width: 45, align: 'right' })
    })

    doc.moveTo(10, doc.y).lineTo(217, doc.y).stroke().moveDown(0.3)

    // Totals
    const totRow = (label, val) => {
      doc.text(label, 10, doc.y, { width: 155, continued: true })
      doc.text(`₹${val}`, { width: 52, align: 'right' })
    }
    totRow('Subtotal:', subtotal.toFixed(2))
    if (discountAmount > 0) totRow('Discount:', `-${discountAmount.toFixed(2)}`)
    if (gstAmount > 0)      totRow('GST:', gstAmount.toFixed(2))
    doc.font('Helvetica-Bold')
    totRow('TOTAL:', totalAmount.toFixed(2))
    doc.font('Helvetica')

    doc.moveTo(10, doc.y).lineTo(217, doc.y).stroke().moveDown(0.3)
    const modeLabel = payments?.length > 1
      ? payments.map(p => `${p.mode}:₹${p.amount}`).join(' + ')
      : paymentMode.toUpperCase()
    doc.fontSize(8).text(`Payment: ${modeLabel}`, { align: 'center' })
    doc.moveDown(0.5).text(shop.billing?.thankYouMessage || 'Thank you! Visit again 🙏', { align: 'center' })
    if (shop.billing?.footerText) doc.fontSize(7).text(shop.billing.footerText, { align: 'center' })

    doc.end()
  })
}
