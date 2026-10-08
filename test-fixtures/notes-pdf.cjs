// A real two-page, selectable-text PDF with old dates in the teaching examples.
const notesPages=[[
 'Financial Accounting - Prepaid Expenses',
 'A prepaid expense is an asset until the future benefit is used.',
 'Record rent paid in advance as Prepaid Rent, with a credit to Cash.',
 'At month-end, debit Rent Expense and credit Prepaid Rent for coverage used.',
 'Class example: On January 1, 2022, pay $3,600 for three months of rent.',
 'The monthly rent expense in this example is $1,200.'
],[
 'Insurance and Accounting Periods',
 'Insurance paid in advance is Prepaid Insurance, not an immediate expense.',
 'Recognize Insurance Expense as coverage is used during the month.',
 'Show the payment date, coverage dates, and total premium on the policy.',
 'A quote or proposed order with no payment or service needs no entry.',
 'Use the assigned business period, not the dates in these textbook examples.'
]];
function notesPdf(){const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];for(const [i,lines]of notesPages.entries()){const content='BT /F1 12 Tf 48 760 Td 20 TL '+lines.map((text,j)=>(j?'T* ':'')+'('+text.replace(/[\\()]/g,'\\$&')+') Tj').join('\n')+' ET';objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+(5+i*2)+' 0 R >>','<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'\nendstream');}let pdf='%PDF-1.4\n',offsets=[0];for(const [i,obj]of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';}const start=Buffer.byteLength(pdf);pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';return Buffer.from(pdf);}
module.exports={notesPdf,notesPages};
