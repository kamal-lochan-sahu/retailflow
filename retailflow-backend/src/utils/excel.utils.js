import ExcelJS from 'exceljs'

export const exportSalesToExcel = async (sales, period) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = process.env.SHOP_NAME || 'RetailFlow'
  const ws = wb.addWorksheet('Sales Report')

  ws.columns = [
    { header: 'Bill No',    key: 'billNumber',   width: 18 },
    { header: 'Date',       key: 'date',         width: 18 },
    { header: 'Customer',   key: 'customer',     width: 20 },
    { header: 'Items',      key: 'itemCount',    width: 8  },
    { header: 'Subtotal',   key: 'subtotal',     width: 12 },
    { header: 'Discount',   key: 'discount',     width: 12 },
    { header: 'GST',        key: 'gst',          width: 12 },
    { header: 'Total',      key: 'total',        width: 14 },
    { header: 'Payment',    key: 'payment',      width: 14 },
    { header: 'Staff',      key: 'staff',        width: 16 },
    { header: 'Status',     key: 'status',       width: 12 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF2563EB' } }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  sales.forEach(sale => {
    ws.addRow({
      billNumber: sale.billNumber,
      date:       new Date(sale.createdAt).toLocaleString('en-IN'),
      customer:   sale.customerId?.name || 'Walk-in',
      itemCount:  sale.items.length,
      subtotal:   sale.subtotal,
      discount:   sale.discountAmount,
      gst:        sale.gstAmount,
      total:      sale.totalAmount,
      payment:    sale.paymentMode,
      staff:      sale.staffId?.name || '',
      status:     sale.status,
    })
  })

  // Total row
  const totalRow = ws.addRow({
    billNumber: 'TOTAL',
    total: sales.reduce((s,sale) => s + sale.totalAmount, 0)
  })
  totalRow.font = { bold: true }

  const buf = await wb.xlsx.writeBuffer()
  return buf
}

export const exportProductsToExcel = async (products) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Products')

  ws.columns = [
    { header: 'SKU',          key: 'sku',          width: 16 },
    { header: 'Name',         key: 'name',         width: 30 },
    { header: 'Category',     key: 'category',     width: 18 },
    { header: 'MRP',          key: 'mrp',          width: 12 },
    { header: 'Selling Price',key: 'sellingPrice',  width: 14 },
    { header: 'Stock',        key: 'stock',        width: 10 },
    { header: 'Unit',         key: 'unit',         width: 10 },
    { header: 'Min Stock',    key: 'minStock',     width: 10 },
    { header: 'Barcode',      key: 'barcode',      width: 18 },
  ]

  ws.getRow(1).font = { bold: true }
  products.forEach(p => ws.addRow({
    sku: p.sku, name: p.name,
    category: p.category?.name || '',
    mrp: p.mrp, sellingPrice: p.sellingPrice,
    stock: p.stock, unit: p.unit, minStock: p.minStock, barcode: p.barcode
  }))

  return wb.xlsx.writeBuffer()
}
