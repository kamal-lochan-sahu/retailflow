import PDFDocument from 'pdfkit'
import dayjs from 'dayjs'

export const createPurchaseOrderPDF = (purchase, supplier, shopSettings) => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))

    const { shop } = shopSettings
    doc.fontSize(18).font('Helvetica-Bold').text(shop.name, { align:'center' })
    doc.fontSize(12).font('Helvetica').text('PURCHASE ORDER', { align:'center' })
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.5)

    doc.text(`PO Number: ${purchase.poNumber}`)
    doc.text(`Date: ${dayjs(purchase.createdAt).format('DD MMM YYYY')}`)
    doc.text(`To: ${supplier.name} | ${supplier.phone || ''}`)
    doc.moveDown()

    let y = doc.y
    doc.font('Helvetica-Bold').fontSize(9)
    doc.rect(40, y, 515, 18).fill('#e5e7eb').fillColor('#000')
    doc.text('#',     42, y+4, { width:25 })
    doc.text('Item', 70, y+4, { width:200 })
    doc.text('Qty',  280, y+4, { width:60,  align:'right' })
    doc.text('Price',345, y+4, { width:80,  align:'right' })
    doc.text('Total',430, y+4, { width:80,  align:'right' })
    y += 20; doc.font('Helvetica').fontSize(9)

    purchase.items.forEach((item, i) => {
      const total = item.quantity * item.purchasePrice
      doc.text(`${i+1}`,            42, y, { width:25 })
      doc.text(item.name||'',       70, y, { width:200 })
      doc.text(`${item.quantity}`, 280, y, { width:60, align:'right' })
      doc.text(`₹${item.purchasePrice}`, 345, y, { width:80, align:'right' })
      doc.text(`₹${total.toFixed(2)}`,   430, y, { width:80, align:'right' })
      y += 16
    })

    doc.moveTo(40, y).lineTo(555, y).stroke()
    y += 10
    doc.font('Helvetica-Bold')
    doc.text(`Total: ₹${purchase.totalAmount}`, 350, y, { width:205, align:'right' })

    doc.moveDown(3)
    doc.font('Helvetica').fontSize(9).text('Authorised Signatory', 40, doc.y)
    doc.end()
  })
}
