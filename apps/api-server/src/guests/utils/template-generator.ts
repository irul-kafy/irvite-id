import * as ExcelJS from 'exceljs';

export async function generateGuestImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IRVITE.ID';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Data Tamu', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Nama Tamu', key: 'name', width: 30 },
    { header: 'Kategori', key: 'category', width: 18 },
    { header: 'No. WhatsApp', key: 'phone', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Jumlah Tamu', key: 'maxPax', width: 16 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 26;

  // Add clean sample rows (no real PII)
  const sampleRows = [
    {
      name: 'Budi Santoso (Contoh: Keluarga)',
      category: 'VIP',
      phone: '081234567890',
      email: 'budi.santoso@example.com',
      maxPax: 2,
    },
    {
      name: 'Keluarga Andi Wijaya',
      category: 'KELUARGA',
      phone: '081987654321',
      email: '',
      maxPax: 4,
    },
    {
      name: 'Siti Rahma & Partner',
      category: 'REGULAR',
      phone: '',
      email: 'siti.rahma@example.com',
      maxPax: 2,
    },
    {
      name: 'Dr. Hendra Gunawan',
      category: 'VIP',
      phone: '085712345678',
      email: '',
      maxPax: 1,
    },
  ];

  for (const sample of sampleRows) {
    const row = worksheet.addRow(sample);
    row.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
