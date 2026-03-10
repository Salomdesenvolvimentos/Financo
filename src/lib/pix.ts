// ============================================
// FINANCO - Utilitário: Gerador de PIX EMV
// ============================================

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(
  key: string,
  name: string,
  city: string,
  amount: number
): string {
  // Campo 26: Merchant Account Information
  const merchantAccount =
    emvField('00', 'br.gov.bcb.pix') +
    emvField('01', key);

  // Campo 62: Additional Data Field (txid obrigatório)
  const additionalData = emvField('05', '***');

  const payload =
    emvField('00', '01') +                          // Payload Format Indicator
    emvField('26', merchantAccount) +                // Merchant Account Information
    emvField('52', '0000') +                        // Merchant Category Code
    emvField('53', '986') +                          // Transaction Currency (BRL)
    emvField('54', amount.toFixed(2)) +              // Transaction Amount
    emvField('58', 'BR') +                           // Country Code
    emvField('59', name.substring(0, 25)) +          // Merchant Name
    emvField('60', city.substring(0, 15)) +          // Merchant City
    emvField('62', additionalData) +                 // Additional Data Field
    '6304';                                          // CRC (sem valor ainda)

  return payload + crc16ccitt(payload);
}
