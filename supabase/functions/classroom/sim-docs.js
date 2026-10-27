// Source documents for the office simulation, rendered as paperwork the owner
// would actually receive: letterhead invoices, register reports, checks, notes.
(function (root) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const m2 = (n) => Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const addr = (p) => `${esc(p.street)}<br>${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)}`;
  const words = (n) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const h = (x) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 < 20 ? a[x % 100] : t[Math.floor((x % 100) / 10)] + (x % 10 ? '-' + a[x % 10] : ''));
    const d = Math.floor(n), c = Math.round((n - d) * 100);
    const th = Math.floor(d / 1000), r = d % 1000;
    return ((th ? h(th) + ' Thousand' + (r ? ' ' : '') : '') + (r ? h(r) : th ? '' : 'Zero')) + ` and ${String(c).padStart(2, '0')}/100`;
  };

  const R = {
    email: (d) => `<article class="doc d-email"><header><div class="em-subj">${esc(d.subject)}</div><div class="em-row"><b>${esc(d.fromName)}</b> &lt;${esc(d.from)}&gt;</div><div class="em-row">To: ${esc(d.to)}</div><div class="em-row em-date">${esc(d.date)}</div></header><div class="em-body">${d.body}</div>${d.sig ? `<div class="em-sig">${d.sig}</div>` : ''}${d.attach ? `<div class="em-att">${d.attach.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</article>`,

    text: (d) => `<article class="doc d-text"><div class="tx-head">${esc(d.fromName)}<small>${esc(d.phone)}</small></div>${d.msgs.map(([who, t]) => `<div class="tx-msg ${who === 'me' ? 'me' : ''}">${esc(t)}</div>`).join('')}<div class="tx-time">${esc(d.date)}</div></article>`,

    invoice: (d) => {
      const sub = d.lines.reduce((t, [, q, u]) => t + q * u, 0), tax = d.taxRate ? Math.round(sub * d.taxRate * 100) / 100 : 0, ship = d.freight || 0;
      return `<article class="doc d-inv" style="--brand:${d.vendor.color || '#334155'}"><header class="inv-top"><div class="inv-logo"><b>${esc(d.vendor.name)}</b><span>${esc(d.vendor.tagline || '')}</span><small>${addr(d.vendor)}<br>${esc(d.vendor.phone)}</small></div><div class="inv-meta"><h2>${esc(d.title || 'INVOICE')}</h2><table><tr><td>Invoice #</td><td>${esc(d.no)}</td></tr><tr><td>Date</td><td>${esc(d.date)}</td></tr>${d.po ? `<tr><td>PO #</td><td>${esc(d.po)}</td></tr>` : ''}<tr><td>Terms</td><td>${esc(d.terms)}</td></tr>${d.due ? `<tr><td>Due</td><td>${esc(d.due)}</td></tr>` : ''}</table></div></header>
<div class="inv-to"><div><small>BILL TO</small>${esc(d.billTo.name)}<br>${addr(d.billTo)}</div>${d.shipTo ? `<div><small>SHIP TO</small>${esc(d.shipTo)}</div>` : ''}</div>
<table class="inv-lines"><thead><tr><th>Item</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${d.lines.map(([desc, q, u, sku]) => `<tr><td>${esc(sku || '')}</td><td>${esc(desc)}</td><td class="r">${q}</td><td class="r">${m2(u)}</td><td class="r">${m2(q * u)}</td></tr>`).join('')}</tbody></table>
<table class="inv-tot"><tr><td>Subtotal</td><td>${m2(sub)}</td></tr>${tax ? `<tr><td>Sales tax</td><td>${m2(tax)}</td></tr>` : ''}${ship ? `<tr><td>Freight</td><td>${m2(ship)}</td></tr>` : ''}<tr class="grand"><td>Total due</td><td>$${m2(sub + tax + ship)}</td></tr></table>
${d.paid ? `<div class="stamp paid">PAID ${esc(d.paid)}</div>` : ''}<footer>${esc(d.footer || 'Thank you for your business.')}${d.remit ? `<br>Please remit to: ${esc(d.remit)}` : ''}</footer></article>`;
    },

    receipt: (d) => `<article class="doc d-rcpt"><div class="rc-c"><b>${esc(d.store)}</b><br>${addr(d.addr)}<br>${esc(d.phone || '')}</div><div class="rc-row"><span>${esc(d.date)}</span><span>${esc(d.time || '')}</span></div><div class="rc-row"><span>Trans #${esc(d.no)}</span><span>Reg ${esc(d.reg || '02')}</span></div><hr>${d.lines.map(([t, x]) => `<div class="rc-row"><span>${esc(t)}</span><span>${m2(x)}</span></div>`).join('')}<hr>${d.tax ? `<div class="rc-row"><span>TAX</span><span>${m2(d.tax)}</span></div>` : ''}<div class="rc-row big"><span>TOTAL</span><span>${m2(d.lines.reduce((t, [, x]) => t + x, 0) + (d.tax || 0))}</span></div><div class="rc-row"><span>${esc(d.tender)}</span><span></span></div><div class="rc-c rc-foot">${esc(d.footer || 'THANK YOU')}</div></article>`,

    register: (d) => `<article class="doc d-rcpt d-z"><div class="rc-c"><b>${esc(d.store)}</b><br>Z REPORT · ${esc(d.period)}</div><hr>${d.rows.map(([t, x]) => `<div class="rc-row"><span>${esc(t)}</span><span>${typeof x === 'number' ? m2(x) : esc(x)}</span></div>`).join('')}<hr><div class="rc-row big"><span>NET SALES</span><span>${m2(d.net)}</span></div>${d.tenders.map(([t, x]) => `<div class="rc-row"><span>${esc(t)}</span><span>${m2(x)}</span></div>`).join('')}<div class="rc-c rc-foot">Printed ${esc(d.printed)}<br>*** END OF REPORT ***</div></article>`,

    check: (d) => `<article class="doc d-check"><div class="ck-top"><div><b>${esc(d.payer)}</b><br>${addr(d.payerAddr)}</div><div class="ck-no">${esc(d.no)}<br><small>Date</small> <u>${esc(d.date)}</u></div></div><div class="ck-pay"><small>PAY TO THE<br>ORDER OF</small><u>${esc(d.payee)}</u><span class="ck-amt">$ ${m2(d.amount)}</span></div><div class="ck-words"><u>${esc(words(d.amount))}</u> DOLLARS</div><div class="ck-bot"><div><b>${esc(d.bank)}</b><br><small>Memo</small> <u>${esc(d.memo || '')}</u></div><div class="ck-sig">${esc(d.signer || '')}</div></div><div class="ck-micr">&#8282;${esc(d.routing || '044000037')}&#8282; ${esc(d.acct || '2210048837')}&#8283; ${esc(d.no)}</div></article>`,

    deposit: (d) => `<article class="doc d-dep"><header><b>${esc(d.bank)}</b><span>DEPOSIT TICKET</span></header><div class="dp-who">${esc(d.name)}<br><small>Account ${esc(d.acct)}</small></div><table>${d.rows.map(([t, x]) => `<tr><td>${esc(t)}</td><td>${m2(x)}</td></tr>`).join('')}<tr class="grand"><td>Total deposit</td><td>$${m2(d.rows.reduce((t, [, x]) => t + x, 0))}</td></tr></table><div class="dp-date">Date ${esc(d.date)}</div><div class="stamp recv">RECEIVED ${esc(d.date)}</div></article>`,

    legal: (d) => `<article class="doc d-legal"><h2>${esc(d.title)}</h2>${d.sub ? `<div class="lg-sub">${esc(d.sub)}</div>` : ''}${d.paras.map((p, i) => `<p>${d.numbered ? `<b>${i + 1}.</b> ` : ''}${p}</p>`).join('')}<div class="lg-sigs">${d.sigs.map(([n, r]) => `<div><span class="lg-line">${esc(n)}</span><small>${esc(r)}</small></div>`).join('')}</div></article>`,

    cert: (d) => `<article class="doc d-cert"><div class="ct-in"><div class="ct-no">No. ${esc(d.no)}</div><div class="ct-sh">${esc(d.shares.toLocaleString('en-US'))} Shares</div><h2>${esc(d.corp)}</h2><div class="ct-st">Incorporated under the laws of the State of ${esc(d.state)}</div><p>This certifies that <b>${esc(d.holder)}</b> is the owner of <b>${esc(words(d.shares).replace(/ and 00\/100$/, ''))} (${d.shares.toLocaleString('en-US')})</b> fully paid and non-assessable shares of Common Stock${d.par ? `, par value $${m2(d.par)} per share,` : ', without par value,'} of ${esc(d.corp)}.</p><div class="lg-sigs"><div><span class="lg-line">${esc(d.holder)}</span><small>President</small></div><div><span class="lg-line">${esc(d.secretary)}</span><small>Secretary</small></div></div></div></article>`,

    statement: (d) => `<article class="doc d-inv d-stmt" style="--brand:${d.color || '#1e3a5f'}"><header class="inv-top"><div class="inv-logo"><b>${esc(d.bank)}</b><small>Business Checking Statement</small></div><div class="inv-meta"><table><tr><td>Account</td><td>${esc(d.acct)}</td></tr><tr><td>Period</td><td>${esc(d.period)}</td></tr></table></div></header><table class="inv-lines"><thead><tr><th>Date</th><th>Description</th><th class="r">Withdrawals</th><th class="r">Deposits</th><th class="r">Balance</th></tr></thead><tbody>${d.rows.map(([dt, t, w, dep, b]) => `<tr><td>${esc(dt)}</td><td>${esc(t)}</td><td class="r">${w ? m2(w) : ''}</td><td class="r">${dep ? m2(dep) : ''}</td><td class="r">${m2(b)}</td></tr>`).join('')}</tbody></table></article>`,
  };

  R.schedule = d => `<article class="doc d-legal"><header><b>${esc(d.name)}</b><small>${esc(d.date)}</small></header><h2>${esc(d.title)}</h2><table class="jt">${d.rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(typeof value === 'number' ? m2(value) : value)}</td></tr>`).join('')}</table><p>${esc(d.note)}</p></article>`;
  R.record = d => `<article class="doc d-inv"><header class="inv-top"><div class="inv-logo"><b>${esc(d.issuer)}</b><small>Business records</small></div><div class="inv-meta"><h2>${esc(d.status)}</h2><small>Reference ${esc(d.no)}<br>${esc(d.date)}</small></div></header><h3>${esc(d.title)}</h3>${d.items?.length ? `<table class="inv-lines"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${d.items.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.quantity)}</td><td>${m2(x.price)}</td><td>${m2(x.total)}</td></tr>`).join('')}</tbody></table>` : ''}<table class="jt">${d.fields.map(f => `<tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join('')}</table><footer>Business copy · Keep with the supporting records.</footer></article>`;
  root.SIMDOCS = {render: (spec) => (R[spec.type] ? R[spec.type](spec) : ''), words, m2};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SIMDOCS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
