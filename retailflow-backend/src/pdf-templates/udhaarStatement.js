import PDFDocument from 'pdfkit'
import dayjs from 'dayjs'

export const createUdhaarStatement = (customer, ledger, shopSettings) => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))

    const { shop } = shopSettings

    doc.fontSize(18).font('Helvetica-Bold').text(shop.name, { align:'center' })
    doc.fontSize(10).font('Helvetica').text('ACCOUNT STATEMENT', { align:'center' })
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.5)

    doc.text(`Customer: ${customer.name}`)
    doc.text(`Phone: ${customer.phone}`)
    doc.text(`Generated: ${dayjs().format('DD MMM YYYY')}`)
    doc.moveDown()

    // Table
    doc.font('Helvetica-Bold').fontSize(9)
    let y = doc.y
    doc.rect(40, y, 515, 18).fill('#e5e7eb').fillColor('#000')
    doc.text('Date',    42,  y+4, { width:90  })
    doc.text('Type',   135,  y+4, { width:60  })
    doc.text('Details',200,  y+4, { width:180 })
    doc.text('Debit',  390,  y+4, { width:70, align:'right' })
    doc.text('Credit', 460,  y+4, { width:70, align:'right' })
    doc.text('Balance',510,  y+4, { width:65, align:'right' })
    y += 20; doc.font('Helvetica').fontSize(9)

    ledger.forEach(entry => {
      const isCredit = entry.type === 'credit'
      doc.text(dayjs(entry.createdAt).format('DD/MM/YY'), 42, y, { width:90 })
      doc.text(entry.type.toUpperCase(),                  135, y, { width:60 })
      doc.text((entry.note||'').substring(0,28),          200, y, { width:180 })
      doc.text(isCredit ? `₹${entry.amount}` : '',        390, y, { width:70, align:'right' })
      doc.text(!isCredit? `₹${entry.amount}` : '',        460, y, { width:70, align:'right' })
      doc.text(`₹${entry.balance}`,                       510, y, { width:65, align:'right' })
      y += 16
    })

    doc.moveTo(40, y).lineTo(555, y).stroke()
    y += 10
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text(`Outstanding Balance: ₹${customer.outstandingBalance}`, 350, y, { width:205, align:'right' })

    doc.end()
  })
}
