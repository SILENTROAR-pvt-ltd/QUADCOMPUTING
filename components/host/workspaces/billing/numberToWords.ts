// Utility to convert numbers to words (Indian Numbering System)
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number) => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[Math.floor(n)];
    }
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let out = '';
  if (rupees > 99999) {
    out += inWords(Math.floor(rupees / 100000)) + ' Lakh ';
  }
  let rem = rupees % 100000;
  if (rem > 999) {
    out += inWords(Math.floor(rem / 1000)) + ' Thousand ';
  }
  rem %= 1000;
  if (rem > 0) {
    out += inWords(rem);
  }

  let finalStr = out.trim() + ' Rupees';
  if (paise > 0) {
    finalStr += ' and ' + inWords(paise) + ' Paise';
  }
  return finalStr + ' Only.';
}
