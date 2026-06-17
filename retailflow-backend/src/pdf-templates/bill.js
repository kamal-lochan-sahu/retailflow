// Bill template — uses pdf.utils.js createBillPDF
// This file exports template config for different receipt styles

export const RECEIPT_TEMPLATES = {
  standard: {
    width:   227,  // 80mm thermal
    margin:  10,
    fontSize: { header: 14, body: 8, footer: 7 }
  },
  a4: {
    width:   595,
    margin:  40,
    fontSize: { header: 18, body: 10, footer: 9 }
  }
}
