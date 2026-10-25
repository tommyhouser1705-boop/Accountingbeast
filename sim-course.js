(function (root) {
  const S = root.SIM, {r2, bal, money} = S;
  const {me, at, loc, kit, priceOf, bank} = S.M1;
  const equip = s => S.M1.equip(s)[1];
  const dr = (a, x) => [a, 'dr', r2(x)], cr = (a, x) => [a, 'cr', r2(x)];
  const date = (s, d) => S.fmtDate(s, d, 'short');
  const email = (s, day, from, subject, body) => ({type: 'email', fromName: from, from: from.toLowerCase().replace(/[^a-z]+/g,'.').replace(/\.$/,'')+'@office.example', to: S.M1.email(s), date: date(s, day), subject, body});
  const sheet = (s, title, rows, note = '') => ({type: 'schedule', name: s.biz.name + ', Inc.', title, date: date(s, s.day), rows, note});
  const receipt = (s, day, store, no, desc, x) => ({type: 'receipt', store, addr: at(s, '240 Market Street'), date: date(s, day), no, tender: 'Business checking ····8837', lines: [[desc, r2(x)]]});
  const invoice = (s, day, vendor, no, desc, x, terms = 'Net 30') => ({type: 'invoice', vendor: {name: vendor, ...at(s, '610 Commerce Drive')}, billTo: me(s), no, date: date(s, day), terms, lines: [[desc, 1, r2(x)]], footer: 'Reference the invoice number with your payment.'});
  function doc(id, day, from, subject, make, lines, more = {}) { return {id, day, from, subject, kind: 'doc', doc: make, lines, ...more}; }
  function reply(id, day, from, subject, body, key, opts, outcome, apply) {
    return {id, day, from, subject, kind: 'decision', doc: s => email(s, day, from, subject, typeof body === 'function' ? body(s) : body), q: [{id: key, label: 'Send reply', opts: opts.map(([v, t, d]) => ({v, t, d}))}], outcome, apply};
  }
  function work(id, day, subject, make, fields, after) { return {id, day, from: 'Karen Ramsey · Ramsey & Cole', subject, kind: 'work', doc: make, fields, after}; }
  const amount = (s, key, fallback) => Number(s.ch[key] ?? fallback);
  const storeValue = (key, fn) => s => { s.vars[key] = fn(s); };
  function month(id, number, title, start, topics, items, review = false) {
    const m = {id: 'sim-' + id, lessonId: id, n: review ? 'Period close' : 'Month ' + number, title, start, days: new Date(Date.UTC(start[0], start[1], 0)).getUTCDate(), topics, items, review};
    S.months.push(m); return m;
  }
  function operations(prefix, end, opts = {}) {
    const volume = s => Math.round(kit(s).base * (s.ch.price === 'high' ? 0.85 : s.ch.price === 'low' ? 1.18 : 1) * (s.ch.capacity === 'expand' ? 1.25 : 1));
    return [
      doc(prefix + '-rent', 2, 'Willow Property Group', 'Monthly occupancy account', s => sheet(s, 'Tenant account · rent applied', [['Current month rent',loc(s).rent],['Payment method',bal(s,'prepaidrent')>=loc(s).rent?'Advance rent credit':'ACH debit, checking 8837']], 'Lease on file. Applying advance rent does not require another cash payment.'), s => [dr('rent', loc(s).rent), cr(bal(s,'prepaidrent')>=loc(s).rent?'prepaidrent':'cash', loc(s).rent)]),
      ...[8, 15, 22].map((day, i) => doc(prefix + '-sales' + i, day, 'Register 02', 'Weekly service sales · batch ' + (i + 1), s => {
        const n = volume(s) + i, x = r2(n * priceOf(s));
        return {type: 'register', store: s.biz.name, period: date(s, day - 6) + ' – ' + date(s, day), rows: [['Completed services', String(n)], ['Unit price', priceOf(s)]], net: x, tenders: [['Bank deposits', x]], printed: date(s, day) + ' 18:05'};
      }, s => [dr('cash', (volume(s) + i) * priceOf(s)), cr('rev', (volume(s) + i) * priceOf(s))])),
      doc(prefix + '-utility', end - 2, 'Municipal Utilities', 'Electricity service invoice', s => invoice(s, end - 2, 'Municipal Utilities', prefix + '-U', 'Meter 4082 · current month service', 287), () => [dr('util', 287), cr('ap', 287)]),
      ...(!opts.noPayroll ? [doc(prefix + '-pay', end - 3, 'Heartland Payroll', 'Payroll settlement · Jordan Pike', s => receipt(s, end - 3, 'Heartland Payroll', prefix + '-P', 'Jordan Pike · 80 hours at $18, no withholding in this introductory cycle', 1440), () => [dr('wages', 1440), cr('cash', 1440)])] : []),
    ];
  }

  month('ch3', 2, 'Earn it, use it, accrue it', [2026, 10], ['Accruals', 'Prepayments', 'Depreciation', 'Adjusted trial balance'], [
    reply('m2-hours', 1, 'Jordan Pike', 'October coverage', 'The afternoon slots are filling up. I can add a second shift, or keep my current hours. The extra shift costs $720 this month and adds 25% capacity to future service weeks.', 'capacity', [['steady', 'Keep the current schedule', 'Protect cash and turn away overflow work.'], ['expand', 'Add the afternoon shift', 'More capacity and a larger payroll.']], s => s.ch.capacity === 'expand' ? 'Jordan accepted the extra shift. Future service batches reflect the added capacity.' : 'Jordan kept the existing schedule.'),
    ...operations('m2', 31),
    doc('m2-prepaid', 31, 'Willow Property Group', 'Opening-month rent adjustment', s => sheet(s, 'Advance rent review · September', [['Monthly rent',loc(s).rent],['Opening lease prepayment covered','September, October, November'],['September occupancy','Complete; not yet expensed'],['October rent','Applied separately on October 2']], 'Record the unposted September usage. The remaining November credit stays on account.'), s => [dr('rent', loc(s).rent), cr('prepaidrent', loc(s).rent)]),
    doc('m2-coverage', 5, 'Heartland Mutual', 'Annual insurance policy', s => invoice(s, 5, 'Heartland Mutual', 'HM-1026', '12 months coverage effective October 1; paid by ACH today', 1200, 'Paid'), () => [dr('prepaidins', 1200), cr('cash', 1200)]),
    doc('m2-deposit', 9, 'Civic Events Office', 'November booking deposit', s => receipt(s, 9, s.biz.name, 'DEP-202', 'Customer ACH received for November services; nothing delivered yet', 900), () => [dr('cash', 900), cr('unearned', 900)]),
    doc('m2-shift', 26, 'Heartland Payroll', 'Additional shift payment', s => receipt(s, 26, 'Heartland Payroll', 'PR-204', 'Jordan Pike · October additional shift', 720), () => [dr('wages', 720), cr('cash', 720)], {when: s => s.ch.capacity === 'expand'}),
    doc('m2-count', 30, 'Jordan Pike', 'Signed supplies count', s => sheet(s, 'Supplies count · stockroom', [['Opening stock at cost', bal(s, 'supplies')], ['Counted stock remaining at cost', r2(bal(s, 'supplies') * 0.35)]], 'Counted by Jordan Pike. No purchases are in transit.'), s => [dr('suppliesexp', bal(s, 'supplies') * 0.65), cr('supplies', bal(s, 'supplies') * 0.65)]),
    doc('m2-ins-used', 31, 'Heartland Mutual', 'October coverage confirmation', s => sheet(s, 'Coverage schedule', [['Annual premium', 1200], ['Term in months', 12], ['Completed months', 1]], 'October coverage has elapsed. Policy remains in force.'), () => [dr('insexp', 100), cr('prepaidins', 100)]),
    doc('m2-dep', 31, 'Ramsey & Cole', 'Equipment depreciation schedule', s => sheet(s, 'Fixed asset register · original equipment', [['Cost', equip(s)], ['Residual value', 0], ['Useful life, months', 60], ['Months in service, including September', 2]], 'Straight-line, full-month convention. No depreciation has been recorded yet.'), s => [dr('depexp', r2(equip(s) / 60) * 2), cr('adep', r2(equip(s) / 60) * 2)]),
    doc('m2-accrual', 31, 'Jordan Pike', 'Timecard · last two shifts', s => sheet(s, 'Approved timecard · October 30–31', [['Hours worked, unpaid', 12], ['Hourly rate', 18]], 'These hours are not included in the earlier payroll settlement. Payday is November 3.'), () => [dr('wages', 216), cr('wagespay', 216)]),
    doc('m2-interest', 31, bank, 'Interest accrual notice', s => sheet(s, 'Note servicing · account 8837-L', [['Principal outstanding', bal(s, 'np')], ['Annual interest rate', '7.5%'], ['Accrual period, months', 2]], 'No interest has been paid since September origination. Full-month convention: principal × annual rate ÷ 12.'), s => [dr('intexp', bal(s, 'np') * 0.075 / 6), cr('intpay', bal(s, 'np') * 0.075 / 6)], {when: s => s.ch.loan > 0}),
  ]);

  function closeItems(prefix, day, final = false) {
    const out = [work(prefix + '-report', day, 'File the financial package', s => sheet(s, 'Controller checklist', [['Package', final ? 'Year-end financial statements' : 'Quarter-end financial statements']], 'Use the Statements tab in Books. File these figures before closing temporary accounts.'), s => {
      const f = S.statements(s);
      return [['revenue', 'Net revenue', f.revenue], ['expenses', 'Expenses', f.expenses], ['profit', 'Net income / loss', f.netIncome], ['assets', 'Total assets', f.assets], ['liabilities', 'Total liabilities', f.liabilities], ['equity', 'Total equity', f.equity], ['operating', 'Operating cash flow', f.operating], ['investing', 'Investing cash flow', f.investing], ['financing', 'Financing cash flow', f.financing]].map(([id, label, value]) => ({id, label, value}));
    }, s => { s.vars[prefix + '-report'] = S.statements(s); s.periodReports ||= {}; s.periodReports[s.m] = S.statements(s); })];
    ['R', 'XR', 'E', 'XSE'].forEach((type, idx) => out.push(doc(prefix + '-close' + idx, day, 'Karen Ramsey · Ramsey & Cole', ['Close revenue accounts', 'Close contra-revenue accounts', 'Close expense accounts', 'Close dividends'][idx], s => sheet(s, 'Closing authorization · ' + type, Object.keys(s.led).filter(a => LL.ACC[a][1] === type && (type !== 'XSE' || a === 'div')).map(a => [LL.ACC[a][0], bal(s, a)]), 'Transfer revenue and expenses directly to Retained Earnings. Close dividends to Retained Earnings separately. Do not close permanent accounts.'), s => {
      const lines = Object.keys(s.led).filter(a => LL.ACC[a][1] === type && (type !== 'XSE' || a === 'div') && bal(s, a)).map(a => LL.dn(a) ? cr(a, bal(s, a)) : dr(a, bal(s, a)));
      const signed = lines.reduce((t, [, side, x]) => t + (side === 'dr' ? x : -x), 0);
      return lines.length ? [...lines, signed > 0 ? cr('re', signed) : dr('re', -signed)] : null;
    }, {when: s => s.done[idx ? prefix + '-close' + (idx - 1) : prefix + '-report']})));
    out.push(work(prefix + '-post', day, 'File post-closing trial balance', s => sheet(s, 'Close checklist · permanent accounts', [['Status', 'Verify after posting all closing entries']], 'Use Trial balance. Revenue, expense and dividends balances must be zero.'), s => { const tb = S.trialBalance(s); return [{id: 'debit', label: 'Total debits', value: r2(tb.reduce((t, r) => t + r[2], 0))}, {id: 'credit', label: 'Total credits', value: r2(tb.reduce((t, r) => t + r[3], 0))}]; }));
    out[out.length - 1].when = s => s.done[prefix + '-close3'];
    return out;
  }
  function review(id, title, start, prefix) {
    const m = month(id, '', title, start, ['Integrated transactions', 'Adjusting entries', 'Statements', 'Closing'], [
      reply(prefix + '-supplier', 1, 'Morgan Ellis · Procurement', 'Year-end purchasing window', 'The supplier can deliver $600 of supplies now on account, or hold the order until the next period. Nothing ships until you approve.', prefix + '-order', [['now', 'Approve delivery now', 'Supplies and payable arrive this period.'], ['later', 'Hold until next period', 'No delivery and no liability this period.']], s => s.ch[prefix + '-order'] === 'now' ? 'Delivery authorized for this period.' : 'The order remains on hold.'),
      ...[2, 3, 4, 5].map((day, i) => doc(prefix + '-jobs' + i, day, 'Operations desk', 'Completed job ticket ' + (i + 1), s => invoice(s, day, s.biz.name, prefix + '-J' + i, 'Completed client work · customer paid by bank transfer', 420 + i * 95, 'Paid'), () => [dr('cash', 420 + i * 95), cr('rev', 420 + i * 95)])),
      doc(prefix + '-delivery', 6, 'Commerce Supply Co.', 'Supplies delivered', s => invoice(s, 6, 'Commerce Supply Co.', prefix + '-S', 'Consumable supplies received', 600), () => [dr('supplies', 600), cr('ap', 600)], {when: s => s.ch[prefix + '-order'] === 'now'}),
      doc(prefix + '-advance', 7, 'Civic Events Office', 'Next-period retainer', s => receipt(s, 7, s.biz.name, prefix + '-D', 'Deposit received; work starts next period', 1200), () => [dr('cash', 1200), cr('unearned', 1200)]),
      doc(prefix + '-fees', 8, bank, 'Account service fee', s => receipt(s, 8, bank, prefix + '-F', 'Business checking service charge', 35), () => [dr('bankfee', 35), cr('cash', 35)]),
      doc(prefix + '-bill', 9, 'Northside IT', 'Workstation repair invoice', s => invoice(s, 9, 'Northside IT', prefix + '-IT', 'Restored workstation to original operating condition', 275), () => [dr('repairs', 275), cr('ap', 275)]),
      doc(prefix + '-payment', 10, 'Accounts payable', 'Supplier payment confirmation', s => receipt(s, 10, 'Commerce Supply Co.', prefix + '-AP', 'ACH settlement of outstanding trade payables', bal(s, 'ap')), s => [dr('ap', bal(s, 'ap')), cr('cash', bal(s, 'ap'))]),
      doc(prefix + '-insurance', 11, 'Heartland Mutual', 'Unexpired policy review', s => sheet(s, 'Coverage review', [['Insurance asset before adjustment', bal(s, 'prepaidins')], ['Coverage used since last adjustment', Math.min(100, bal(s, 'prepaidins'))]], 'No policy cancellation or refund.'), s => bal(s, 'prepaidins') ? [dr('insexp', Math.min(100, bal(s, 'prepaidins'))), cr('prepaidins', Math.min(100, bal(s, 'prepaidins')))] : null),
      doc(prefix + '-count', 12, 'Jordan Pike', 'Closing stockroom count', s => sheet(s, 'Supplies count', [['Ledger cost before count', bal(s, 'supplies')], ['Physical count at cost', r2(bal(s, 'supplies') * 0.6)]], 'Signed by Jordan Pike. Difference represents supplies consumed.'), s => bal(s, 'supplies') ? [dr('suppliesexp', bal(s, 'supplies') * 0.4), cr('supplies', bal(s, 'supplies') * 0.4)] : null),
      doc(prefix + '-accrual', 13, 'Heartland Payroll', 'Unpaid approved time', s => sheet(s, 'Time approval', [['Hours not yet paid', 9], ['Hourly rate', 18]], 'Payment is due next period.'), () => [dr('wages', 162), cr('wagespay', 162)]),
      doc(prefix + '-note', 14, 'Ramsey & Cole', 'Cut-off review · unshipped order', s => email(s, 14, 'Karen Ramsey', 'Vendor cut-off confirmation', 'The $850 equipment order has not shipped. The vendor has not received payment and title has not transferred. Keep the purchase order on file.'), null),
      ...closeItems(prefix, 15),
    ], true);
    const conditions = m.items.map(it => it.when);
    m.items.forEach((it, i) => {
      const condition = conditions[i];
      const original = it.doc;
      it.day = m.days;
      it.doc = s => { const d=S.V(original,s); return {...d,date:date(s,m.days)}; };
      it.when = s => m.items.slice(0, i).every((prev, j) => s.done[prev.id] || (conditions[j] && !conditions[j](s))) && (!condition || condition(s));
    });
    return m;
  }
  review('build1', 'First quarter · close the books', [2026, 11], 'q1');

  month('ch4', 3, 'Keep control of cash', [2026, 11], ['Bank reconciliation', 'NSF payments', 'Petty cash', 'Internal controls'], [
    ...operations('m3', 30),
    doc('m3-wages', 3, 'Heartland Payroll', 'Prior-period wages paid', s => receipt(s, 3, 'Heartland Payroll', 'PR-301', 'Settlement of all wages accrued at the last close', bal(s, 'wagespay')), s => [dr('wagespay', bal(s, 'wagespay')), cr('cash', bal(s, 'wagespay'))]),
    doc('m3-earned', 9, 'Civic Events Office', 'November job completed', s => sheet(s, 'Customer acceptance', [['Prepaid booking fulfilled', 900]], 'Civic Events Office accepted the completed work. Deposit was paid in October.'), () => [dr('unearned', 900), cr('rev', 900)]),
    reply('m3-control', 10, 'Jordan Pike', 'Small purchases are piling up', 'We need a petty cash fund for minor purchases. I can keep a $200 locked fund and attach receipts, or use a $400 fund with a weekly count. Both require your approval for replenishment.', 'petty', [[200, 'Authorize a $200 fund', 'Weekly count and signed vouchers.'], [400, 'Authorize a $400 fund', 'More room for small purchases.']], s => 'Petty cash authorized at ' + money(s.ch.petty) + '.'),
    doc('m3-fund', 11, 'Cash custodian', 'Petty cash establishment', s => receipt(s, 11, 'Heartland Community Bank', 'PC-301', 'Transfer to locked petty cash fund', s.ch.petty), s => [dr('pettycash', s.ch.petty), cr('cash', s.ch.petty)]),
    doc('m3-vouchers', 18, 'Jordan Pike', 'Petty cash reimbursement', s => sheet(s, 'Petty cash count and vouchers', [['Fund authorization', s.ch.petty], ['Postage vouchers', 42], ['Emergency supplies vouchers', 28], ['Currency counted', s.ch.petty - 72]], 'Replenish to the authorized amount. No other vouchers are outstanding.'), () => [dr('misc', 42), dr('supplies', 28), dr('cashos', 2), cr('cash', 72)]),
    doc('m3-check', 20, 'Mason Street Offices', 'Customer payment received', s => ({type: 'check', payer: 'Mason Street Offices', payerAddr: at(s, '88 Mason Street'), date: date(s, 20), no: '6108', payee: s.biz.name, amount: 600, bank, memo: 'Work completed today'}), () => [dr('cash', 600), cr('rev', 600)]),
    doc('m3-nsf', 24, bank, 'Returned item notice', s => sheet(s, 'Returned deposit · check 6108', [['Mason Street Offices · insufficient funds', 600], ['Bank handling charge', 20]], 'Your bank debited both amounts from checking. Seek collection of the original $600 from the customer.'), () => [dr('ar', 600), dr('bankfee', 20), cr('cash', 620)]),
    doc('m3-fee', 30, bank, 'Month-end service charge', s => receipt(s, 30, bank, 'FEE-311', 'Checking service fee', 25), () => [dr('bankfee', 25), cr('cash', 25)]),
    work('m3-reconcile', 30, 'Reconcile checking · November', s => sheet(s, 'Heartland Community Bank · reconciliation packet', [['Bank statement ending balance', r2(bal(s, 'cash') + 175)], ['Deposit in transit, November 30', 250], ['Outstanding check 1028', 425], ['Book cash after service fee posting', bal(s, 'cash')]], 'All statement fees and returned items have been posted. No bank errors. Enter adjusted balances; do not journalize timing differences.'), s => [{id: 'bank', label: 'Adjusted bank balance', value: bal(s, 'cash')}, {id: 'book', label: 'Adjusted book balance', value: bal(s, 'cash')}]),
  ]);

  month('ch5', 4, 'Grow without losing collections', [2026, 12], ['Credit policy', 'Aging', 'Allowance', 'Write-offs', 'Notes receivable'], [
    ...operations('m4', 31),
    reply('m4-credit', 1, 'Harbor Point Offices', 'Monthly service contract', 'We can commit to a $3,000 package on net-30 terms, or pay $1,800 in advance for a smaller package. Full service is completed December 9. The credit contract carries more collection risk.', 'credit', [['net30', 'Accept $3,000 on net 30', 'Larger contract, with collection exposure.'], ['advance', 'Accept $1,800 cash package', 'Smaller contract, collected on delivery.']], s => 'Customer contract approved: ' + s.ch.credit + '.'),
    doc('m4-contract', 9, 'Harbor Point Offices', 'Accepted service completion', s => invoice(s, 9, s.biz.name, 'HP-401', 'Contract work completed and accepted', s.ch.credit === 'net30' ? 3000 : 1800, s.ch.credit === 'net30' ? 'Net 30' : 'Paid on completion'), s => [dr(s.ch.credit === 'net30' ? 'ar' : 'cash', s.ch.credit === 'net30' ? 3000 : 1800), cr('rev', s.ch.credit === 'net30' ? 3000 : 1800)]),
    doc('m4-collection', 12, 'Mason Street Offices', 'Replacement payment', s => receipt(s, 12, s.biz.name, 'RC-401', 'Replacement ACH for returned November check 6108', 600), () => [dr('cash', 600), cr('ar', 600)]),
    doc('m4-annual', 14, 'Juniper Management', 'Multi-site service invoice', s => invoice(s, 14, s.biz.name, 'JM-402', 'Work completed for Juniper Management', 2400), () => [dr('ar', 2400), cr('rev', 2400)]),
    doc('m4-partial', 20, 'Juniper Management', 'Partial remittance', s => receipt(s, 20, s.biz.name, 'RC-402', 'Juniper Management payment against JM-402', 1000), () => [dr('cash', 1000), cr('ar', 1000)]),
    doc('m4-note', 23, 'Juniper Management', 'Signed note for balance due', s => ({type: 'legal', title: 'Promissory note · JM-402', paras: ['Juniper Management promises to pay $1,400 principal plus interest at 6% annually. Issued December 23; due March 23. This note replaces the remaining trade receivable.'], sigs: [['Tessa Moore', 'Juniper Management']]}), () => [dr('nr', 1400), cr('ar', 1400)]),
    doc('m4-small', 24, 'Westgate Services', 'Credit invoice · emergency work', s => invoice(s, 24, s.biz.name, 'WG-403', 'Completed service', 500), () => [dr('ar', 500), cr('rev', 500)]),
    doc('m4-aging', 30, 'Ramsey & Cole', 'Allowance review', s => sheet(s, 'Receivable aging · required ending allowance', [['Open trade receivables', bal(s, 'ar')], ['Estimated uncollectible percentage', '10%'], ['Allowance balance before adjustment', bal(s, 'allow')]], 'All open trade invoices are in the same risk pool in this cycle. Bring the allowance to 10% of open trade receivables; exclude the promissory note.'), s => [dr('bde', r2(bal(s, 'ar') * 0.1) - bal(s, 'allow')), cr('allow', r2(bal(s, 'ar') * 0.1) - bal(s, 'allow'))]),
    doc('m4-writeoff', 31, 'Collections desk', 'Westgate account closed', s => sheet(s, 'Write-off approval · WG-403', [['Account balance', 500]], 'Westgate ceased operations. Collection counsel authorized a write-off under the allowance method.'), () => [dr('allow', 500), cr('ar', 500)]),
  ]);

  month('ch6', 5, 'Launch a product line', [2027, 1], ['Perpetual inventory', 'Returns', 'Freight', 'Cost of goods sold', 'Shrinkage'], [
    ...operations('m5', 31),
    reply('m5-stock', 1, 'Morgan Ellis · Commerce Supply', 'First retail shipment', 'We have a product line ready for your counter. Unit cost is $40. Choose an initial shipment of 30 or 50 units, net 30. A larger shelf improves availability but ties up cash.', 'units', [[30, 'Order 30 units', '$1,200 before freight.'], [50, 'Order 50 units', '$2,000 before freight.']], s => s.ch.units + ' units ordered.'),
    doc('m5-purchase', 3, 'Commerce Supply Co.', 'Retail goods delivered', s => invoice(s, 3, 'Commerce Supply Co.', 'CS-501', 'Retail product units · ' + s.ch.units + ' at $40', s.ch.units * 40), s => [dr('inv', s.ch.units * 40), cr('ap', s.ch.units * 40)]),
    doc('m5-freight', 4, 'Midstate Freight', 'Inbound freight paid', s => receipt(s, 4, 'Midstate Freight', 'MF-501', 'FOB shipping point · retail shipment CS-501', 120), () => [dr('inv', 120), cr('cash', 120)]),
    doc('m5-cost', 5, 'Inventory desk', 'Landed-cost card', s => sheet(s, 'Inventory cost card · perpetual system', [['Units received', s.ch.units], ['Supplier cost per unit', 40], ['Freight allocated to lot', 120], ['Landed cost per unit', r2(40 + 120 / s.ch.units)]], 'Use this landed cost for every sale and return from this lot.'), null),
    ...[10, 17].map((day, i) => doc('m5-retail' + i, day, 'Register 02', 'Retail sales batch ' + (i + 1), s => sheet(s, 'Retail sales and dispatch', [['Units sold', 10], ['Selling price per unit', 85], ['Landed cost per unit', r2(40 + 120 / s.ch.units)]], 'Paid immediately; use two linked entries in one journal: sale and inventory release. This introductory month excludes sales tax.'), s => [dr('cash', 850), cr('sales', 850), dr('cogs', (40 + 120 / s.ch.units) * 10), cr('inv', (40 + 120 / s.ch.units) * 10)])),
    doc('m5-return', 20, 'Customer service', 'Refund and restock authorization', s => sheet(s, 'Return ticket RT-501', [['Sale price refunded', 85], ['Units returned, resalable', 1], ['Cost per unit', r2(40 + 120 / s.ch.units)]], 'Refund issued to customer. Restore the product to inventory at cost.'), s => [dr('returns', 85), cr('cash', 85), dr('inv', 40 + 120 / s.ch.units), cr('cogs', 40 + 120 / s.ch.units)]),
    doc('m5-vendorpay', 25, 'Accounts payable', 'Vendor settlement', s => receipt(s, 25, 'Commerce Supply Co.', 'CS-501-P', 'Settlement of retail invoice CS-501', s.ch.units * 40), s => [dr('ap', s.ch.units * 40), cr('cash', s.ch.units * 40)]),
    doc('m5-count', 31, 'Jordan Pike', 'Retail inventory count', s => sheet(s, 'Cycle count · lot CS-501', [['Units per perpetual record', s.ch.units - 19], ['Units physically counted', s.ch.units - 20], ['Cost per unit', r2(40 + 120 / s.ch.units)]], 'One unit missing. Charge shrinkage to Cost of Goods Sold.'), s => [dr('cogs', 40 + 120 / s.ch.units), cr('inv', 40 + 120 / s.ch.units)]),
  ]);

  month('ch7', 6, 'Put assets to work', [2027, 2], ['Capitalization', 'Depreciation', 'Disposals', 'Repairs'], [
    ...operations('m6', 28),
    reply('m6-van', 1, 'Nora Singh · Fleet Sales', 'Mobile service vehicle', 'We can supply a refurbished van for $12,000 cash or a newer van for $18,000 cash. The newer van has a longer service life. Either lets you take mobile work.', 'van', [[12000, 'Buy the refurbished van', '48-month life; $2,000 residual.'], [18000, 'Buy the newer van', '72-month life; $3,000 residual.']], s => 'Vehicle purchase authorized at ' + money(s.ch.van) + '.'),
    doc('m6-buy', 3, 'Singh Commercial Vehicles', 'Vehicle bill of sale', s => invoice(s, 3, 'Singh Commercial Vehicles', 'SCV-601', 'Service van · title transferred, paid by ACH', s.ch.van, 'Paid'), s => [dr('vehicle', s.ch.van), cr('cash', s.ch.van)]),
    doc('m6-title', 4, 'County Title Office', 'Title and registration receipt', s => receipt(s, 4, 'County Title Office', 'T-601', 'Initial title transfer cost, required to place van in service', 300), () => [dr('vehicle', 300), cr('cash', 300)]),
    doc('m6-wrap', 6, 'Streetline Graphics', 'Vehicle branding invoice', s => invoice(s, 6, 'Streetline Graphics', 'SG-601', 'Removable advertising wrap; no added useful life', 750), () => [dr('adv', 750), cr('ap', 750)]),
    doc('m6-repair', 12, 'Mason Auto Service', 'Van service receipt', s => receipt(s, 12, 'Mason Auto Service', 'MAS-601', 'Oil change and safety inspection', 180), () => [dr('repairs', 180), cr('cash', 180)]),
    doc('m6-job', 19, 'Harbor Point Offices', 'Mobile service work accepted', s => invoice(s, 19, s.biz.name, 'HP-601', 'Completed mobile service visit', s.ch.van === 18000 ? 2400 : 1900), s => [dr('ar', s.ch.van === 18000 ? 2400 : 1900), cr('rev', s.ch.van === 18000 ? 2400 : 1900)]),
    doc('m6-tool', 21, 'Local Equipment Exchange', 'Cash sale · spare tool', s => sheet(s, 'Asset sale packet', [['Tool original cost, included in equipment', 600], ['Accumulated depreciation allocated to tool', 20], ['Cash proceeds', 650]], 'Tool was part of the original equipment lot. Remove its cost and accumulated depreciation; recognize the difference.'), () => [dr('cash', 650), dr('adep', 20), cr('equip', 600), cr('gain', 70)]),
    doc('m6-dep', 28, 'Ramsey & Cole', 'Van depreciation register', s => sheet(s, 'Vehicle register · full-month straight line', [['Capitalized cost', s.ch.van + 300], ['Residual value', s.ch.van === 18000 ? 3000 : 2000], ['Useful life, months', s.ch.van === 18000 ? 72 : 48], ['Months in service', 1]], 'No van depreciation has been posted.'), s => { const x = (s.ch.van + 300 - (s.ch.van === 18000 ? 3000 : 2000)) / (s.ch.van === 18000 ? 72 : 48); return [dr('depexp', x), cr('adep', x)]; }),
  ]);
  review('build2', 'Half-year · audit the business', [2027, 2], 'q2');

  month('ch8', 7, 'Pay people and collect tax', [2027, 3], ['Payroll withholding', 'Employer taxes', 'Sales tax', 'Accrued liabilities'], [
    ...operations('m7', 31, {noPayroll: true}),
    reply('m7-team', 1, 'Jordan Pike', 'March staffing', 'I can cover 80 hours this month, or bring a relief employee for 40 additional hours. Gross pay is $18/hour. More coverage improves future service capacity.', 'staff', [[80, 'Approve 80 hours', 'One-person schedule.'], [120, 'Approve 120 hours', 'Relief coverage included.']], s => 'Payroll approved for ' + s.ch.staff + ' hours.'),
    doc('m7-payroll', 12, 'Heartland Payroll', 'Payroll register · March', s => { const gross = s.ch.staff * 18; return sheet(s, 'Payroll register PR-701', [['Gross wages', gross], ['Employee FICA, 7.65%', r2(gross * 0.0765)], ['Federal withholding', 120], ['Net pay by ACH', r2(gross * 0.9235 - 120)]], 'Employer FICA matches employee FICA. Employer unemployment assessment for this payroll is $48. No state withholding in this exercise.'); }, s => { const g = s.ch.staff * 18, fica = r2(g * 0.0765); return [dr('wages', g), cr('ficapay', fica), cr('fitpay', 120), cr('cash', g - fica - 120)]; }),
    doc('m7-employer', 13, 'Heartland Payroll', 'Employer payroll assessment', s => sheet(s, 'Employer assessment PR-701', [['Employer FICA', r2(s.ch.staff * 18 * 0.0765)], ['Unemployment taxes', 48]], 'Employer cost is additional to amounts withheld from employees.'), s => [dr('ptaxexp', r2(s.ch.staff * 18 * 0.0765) + 48), cr('ficapay', s.ch.staff * 18 * 0.0765), cr('utaxpay', 48)]),
    doc('m7-retail', 16, 'Register 02', 'Taxable retail batch', s => sheet(s, 'Sales-tax batch TX-701', [['Taxable merchandise sales', 425], ['Tax collected, 6%', 25.5], ['Bank deposit', 450.5], ['Inventory cost released', 200]], 'This teaching business uses a flat 6% sales tax on merchandise only; service work is exempt. Tax collected is held for the state.'), () => [dr('cash', 450.5), cr('sales', 425), cr('salestaxpay', 25.5), dr('cogs', 200), cr('inv', 200)]),
    doc('m7-taxpay', 24, 'Treasury payment portal', 'Payroll tax payment', s => receipt(s, 24, 'Treasury payment portal', 'TX-702', 'All FICA and federal withholding for PR-701', bal(s, 'ficapay') + bal(s, 'fitpay')), s => [dr('ficapay', bal(s, 'ficapay')), dr('fitpay', bal(s, 'fitpay')), cr('cash', bal(s, 'ficapay') + bal(s, 'fitpay'))]),
    doc('m7-salesremit', 25, 'State Revenue Office', 'Sales tax remittance', s => receipt(s, 25, 'State Revenue Office', 'TX-703', 'Sales tax batch TX-701', 25.5), () => [dr('salestaxpay', 25.5), cr('cash', 25.5)]),
    doc('m7-unemp', 26, 'State Workforce Office', 'Unemployment remittance', s => receipt(s, 26, 'State Workforce Office', 'TX-704', 'Unemployment assessment PR-701', 48), () => [dr('utaxpay', 48), cr('cash', 48)]),
    doc('m7-warranty', 31, 'Customer care', 'Retail warranty reserve', s => sheet(s, 'Warranty estimate · March merchandise', [['Sales subject to warranty', 425], ['Estimated warranty cost rate', '2%']], 'Recognize expected warranty cost when the sales occur.'), () => [dr('warrexp', 8.5), cr('warrpay', 8.5)]),
  ]);

  month('ch9', 8, 'Finance the next stage', [2027, 4], ['Notes payable', 'Bond issuance', 'Interest', 'Debt settlement'], [
    ...operations('m8', 30),
    reply('m8-finance', 1, 'Avery Chen · Heartland Capital', 'Expansion funding offers', 'The expansion needs $20,000 of funding. We can arrange a 6% bank note at face value, or a five-year private bond placement with $20,000 face value and a 5% coupon, priced at 98. Bond discount is amortized straight-line monthly for this course.', 'funding', [['note', 'Accept the 6% bank note', '$20,000 proceeds.'], ['bond', 'Authorize the bond placement at 98', '$19,600 proceeds; $400 discount.']], s => 'Funding route selected: ' + s.ch.funding + '.'),
    doc('m8-funds', 3, 'Heartland Capital', 'Funding settlement advice', s => sheet(s, 'Funding settlement', [['Face principal', 20000], ['Cash deposited', s.ch.funding === 'note' ? 20000 : 19600], ['Term, months', 60], ['Annual coupon', s.ch.funding === 'note' ? '6%' : '5%']], 'No issuance fees. Funds deposited today.'), s => s.ch.funding === 'note' ? [dr('cash', 20000), cr('np', 20000)] : [dr('cash', 19600), dr('bdisc', 400), cr('bonds', 20000)]),
    doc('m8-project', 10, 'Midstate Installation', 'New equipment installation', s => invoice(s, 10, 'Midstate Installation', 'MI-801', 'Expansion equipment delivered and placed in service; ACH paid', 14000, 'Paid'), () => [dr('equip', 14000), cr('cash', 14000)]),
    doc('m8-oldinterest', 14, bank, 'Accrued interest settlement', s => receipt(s, 14, bank, 'LN-801-I', 'Payment of all previously accrued interest', bal(s, 'intpay')), s => bal(s, 'intpay') ? [dr('intpay', bal(s, 'intpay')), cr('cash', bal(s, 'intpay'))] : null),
    doc('m8-principal', 18, bank, 'Original note principal installment', s => receipt(s, 18, bank, 'LN-801-P', 'Principal reduction on original September note; not the expansion note', Math.min(1000, s.ch.loan || 0)), s => s.ch.loan ? [dr('np', 1000), cr('cash', 1000)] : null),
    doc('m8-interest', 30, 'Heartland Capital', 'Expansion debt accrual', s => sheet(s, 'Debt rollforward · expansion funding only', [['Face principal', 20000], ['Annual coupon', s.ch.funding === 'note' ? '6%' : '5%'], ['Elapsed months since issue, full-month convention', 1], ['Bond discount, if applicable', s.ch.funding === 'bond' ? 400 : 0], ['Amortization term, months', 60]], 'Accrue one month of coupon interest. For bonds, add straight-line discount amortization to interest expense.'), s => s.ch.funding === 'note' ? [dr('intexp', 100), cr('intpay', 100)] : [dr('intexp', r2(20000 * 0.05 / 12) + r2(400 / 60)), cr('intpay', 20000 * 0.05 / 12), cr('bdisc', 400 / 60)]),
  ]);

  month('ch10', 9, 'Bring in an investor', [2027, 5], ['Common stock', 'APIC', 'Treasury stock', 'Dividends', 'Equity rollforward'], [
    ...operations('m9', 31),
    reply('m9-investor', 1, 'Elena Ortiz · Local Growth Partners', 'Equity term sheet', 'We can invest $12,000 for 1,000 new $1-par common shares, or $24,000 for 2,000 shares. Both offers price shares at $12. The larger offer provides cash but gives up more ownership.', 'shares', [[1000, 'Issue 1,000 new shares', '$12,000 in fresh equity.'], [2000, 'Issue 2,000 new shares', '$24,000 in fresh equity.']], s => 'Board authorized ' + s.ch.shares + ' shares.'),
    doc('m9-issue', 4, 'Ramsey & Cole', 'Share subscription settled', s => sheet(s, 'Share register · new issue', [['New common shares', s.ch.shares], ['Par value per share', 1], ['Cash subscription price per share', 12]], 'Investor cash received in full. Record par separately from additional paid-in capital.'), s => [dr('cash', s.ch.shares * 12), cr('cs', s.ch.shares), cr('apic', s.ch.shares * 11)]),
    doc('m9-treasury', 11, 'Transfer agent', 'Treasury share repurchase', s => receipt(s, 11, 'Transfer agent', 'EQ-901', '100 common shares repurchased at $13; use cost method', 1300), () => [dr('treasury', 1300), cr('cash', 1300)]),
    doc('m9-reissue', 18, 'Transfer agent', 'Treasury share reissue', s => sheet(s, 'Treasury stock sale confirmation', [['Shares reissued', 40], ['Original repurchase cost per share', 13], ['Cash received per share', 15]], 'Excess over cost goes to Additional Paid-in Capital, Common. Do not report a gain in earnings.'), () => [dr('cash', 600), cr('treasury', 520), cr('apic', 80)]),
    reply('m9-dividend', 23, 'Board secretary', 'Cash dividend resolution', 'The board can retain earnings for expansion or declare a $600 cash dividend payable May 29. A declaration creates an obligation before cash is paid.', 'dividend9', [[0, 'Retain cash in the business', 'No declaration.'], [600, 'Declare a $600 dividend', 'Payment scheduled May 29.']], s => s.ch.dividend9 ? 'The board declared the dividend.' : 'The board retained cash.'),
    doc('m9-declare', 24, 'Board secretary', 'Board minutes · dividend declared', s => sheet(s, 'Dividend declaration', [['Authorized cash dividend', s.ch.dividend9]], 'Declaration date May 24. Payment date May 29.'), s => s.ch.dividend9 ? [dr('div', 600), cr('divpay', 600)] : null),
    doc('m9-paydiv', 29, 'Transfer agent', 'Dividend payment advice', s => receipt(s, 29, 'Transfer agent', 'EQ-902', 'Dividend distribution authorized May 24', s.ch.dividend9), s => s.ch.dividend9 ? [dr('divpay', 600), cr('cash', 600)] : null),
  ]);
  review('build3', 'Third quarter · report to investors', [2027, 5], 'q3');

  month('ch11', 10, 'Show where the cash went', [2027, 6], ['Operating cash flows', 'Investing', 'Financing', 'Financial statements'], [
    ...operations('m10', 30),
    reply('m10-growth', 1, 'Jordan Pike', 'Summer operating plan', 'We can keep our current footprint, or spend $500 on local advertising to fill the mobile schedule. The campaign adds $900 of completed work this month.', 'summer', [['steady', 'Keep the current footprint', 'No extra advertising.'], ['campaign', 'Launch the $500 campaign', 'Additional work arrives June 19.']], s => s.ch.summer === 'campaign' ? 'Campaign booked.' : 'Current footprint retained.'),
    doc('m10-ad', 4, 'Neighborhood Media', 'Campaign receipt', s => receipt(s, 4, 'Neighborhood Media', 'NM-1001', 'Summer mobile service campaign', 500), () => [dr('adv', 500), cr('cash', 500)], {when: s => s.ch.summer === 'campaign'}),
    doc('m10-bonus', 19, 'Operations desk', 'Campaign jobs completed', s => invoice(s, 19, s.biz.name, 'C-1001', 'Completed summer campaign work · paid', 900, 'Paid'), () => [dr('cash', 900), cr('rev', 900)], {when: s => s.ch.summer === 'campaign'}),
    doc('m10-collect', 20, 'Collections desk', 'Trade receivables collected', s => receipt(s, 20, s.biz.name, 'RC-1001', 'Customer ACH settlements of all open trade invoices', bal(s, 'ar')), s => bal(s, 'ar') ? [dr('cash', bal(s, 'ar')), cr('ar', bal(s, 'ar'))] : null),
    doc('m10-ap', 24, 'Accounts payable', 'Trade payables settled', s => receipt(s, 24, 'Vendor payments', 'AP-1001', 'All outstanding trade invoices paid', bal(s, 'ap')), s => bal(s, 'ap') ? [dr('ap', bal(s, 'ap')), cr('cash', bal(s, 'ap'))] : null),
    doc('m10-land', 25, 'Mason County Title', 'Land purchase settlement', s => invoice(s, 25, 'Mason County Title', 'L-1001', 'Vacant expansion parcel · closing costs included, paid cash', 8000, 'Paid'), () => [dr('land', 8000), cr('cash', 8000)]),
    work('m10-cf', 30, 'Send the lender a cash-flow package', s => email(s, 30, 'Avery Chen · Heartland Capital', 'Cash flow follow-up', 'Please file operating, investing and financing cash flows for this operating period, plus the net change and ending checking balance. Use Books → Statements. Include cash transactions only; do not classify noncash depreciation as a cash payment.'), s => { const f = S.statements(s); return ['operating', 'investing', 'financing', 'change', 'cash'].map(id => ({id, label: {operating: 'Operating cash flow', investing: 'Investing cash flow', financing: 'Financing cash flow', change: 'Net change in checking', cash: 'Ending checking balance'}[id], value: f[id]})); }),
  ]);
  const year = review('capstone', 'Year-end · hand over the books', [2027, 8], 'year');
  year.topics = ['Year-end cut-off', 'Adjustments', 'Financial statements', 'Closing', 'Lender package'];
  const firstReview = S.months.findIndex(m => m.lessonId === 'build1');
  S.months.splice(3, 0, S.months.splice(firstReview, 1)[0]);
  S.months[0].lessonId = 'ch2';
  S.catalog = S.months.map((m, i) => ({id: m.lessonId, index: i, title: m.title, n: m.n, topics: m.topics, review: !!m.review}));
  S.findLesson = id => S.catalog.find(m => m.id === (id === 'ch1' ? 'ch2' : id));

  S.statements = function (s) {
    const f = S.summary(s), sums = types => r2(Object.keys(s.led).filter(a => types.includes(LL.ACC[a][1])).reduce((t, a) => t + bal(s, a), 0));
    f.assets = r2(sums(['A']) - sums(['XA'])); f.liabilities = r2(sums(['L']) - sums(['XL']));
    f.equity = r2(sums(['SE']) - sums(['XSE']) + f.netIncome);
    f.operating = 0; f.investing = 0; f.financing = 0;
    for (const j of s.book.filter(j => (j.m ?? 0) === s.m)) {
      const cash = j.lines.filter(([a]) => a === 'cash').reduce((t, [, side, x]) => t + (side === 'dr' ? x : -x), 0);
      if (!cash) continue;
      const finance = j.lines.filter(([a]) => ['np', 'bonds', 'bdisc', 'bprem', 'cs', 'ps', 'apic', 'apicp', 'treasury', 'div', 'divpay'].includes(a)).reduce((t, [, side, x]) => t + (side === 'cr' ? x : -x), 0);
      const notePrincipal = j.lines.filter(([a]) => a === 'nr').reduce((t,[,side,x]) => t + (side === 'cr' ? x : -x),0);
      const invest = notePrincipal || (j.lines.some(([a]) => ['equip', 'vehicle', 'land', 'building'].includes(a)) ? cash - finance : 0);
      f.financing += finance; f.investing += invest; f.operating += cash - finance - invest;
    }
    for (const k of ['operating', 'investing', 'financing']) f[k] = r2(f[k]);
    f.change = r2(f.operating + f.investing + f.financing);
    return f;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
