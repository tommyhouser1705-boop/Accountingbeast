// Original illustrations and product introduction. No external assets required.
let previewBusiness = 'coffee';
const previewBusinesses = {
  coffee: { name: 'Tommy’s Coffee', type: 'Coffee shop', sign: 'TOMMY’S COFFEE', color: '#5b50d6', window: 'COFFEE & GOOD COMPANY', item: 'Coffee and pastries', invoice: 'Harbor Coffee Supply', amount: '$420.00' },
  bakery: { name: 'Sunday Bakery', type: 'Bakery', sign: 'SUNDAY BAKERY', color: '#d34f35', window: 'BAKED WITH A LITTLE JOY', item: 'Bread and baked goods', invoice: 'Miller Baking Supply', amount: '$360.00' },
  flowers: { name: 'Field & Stem', type: 'Plant shop', sign: 'FIELD & STEM', color: '#176e65', window: 'A LITTLE MORE COLOR', item: 'Plants and arrangements', invoice: 'Greenhouse Wholesale', amount: '$285.00' },
};

function laneIcon(name, size = 22) {
  const paths = {
    shop: '<path d="M3 10h18l-2-6H5l-2 6ZM4 10v10h16V10M9 20v-6h6v6M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0"/>',
    book: '<path d="M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Zm0 14h16M8 7h8M8 11h5"/>',
    chart: '<path d="M4 3v17h17M8 15v-4M13 15V6M18 15V9"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    coffee: '<path d="M5 8h12v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2M3 22h17"/>',
    notes: '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}

function storefrontArt(b) {
  return `<svg class="lane-art" viewBox="0 0 680 470" role="img" aria-label="${safe(b.name)} on a colorful neighborhood street">
  <rect width="680" height="470" rx="24" fill="#d9e5ff"/>
  <circle cx="568" cy="82" r="42" fill="#ffd369"/>
  <path d="M50 90h90m-45-15h80M430 46h58" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
  <path d="M0 340h680v130H0Z" fill="#bfc8ef"/><path d="M0 402h680v68H0Z" fill="#28334f"/>
  <path d="M0 435h680" stroke="#f5cf77" stroke-width="3" stroke-dasharray="30 24"/>
  <path d="M0 396h680" stroke="#fff" stroke-width="6"/>
  <g stroke="#26324f" stroke-width="2.5" stroke-linejoin="round">
    <path d="M12 174 92 153l80 21v176H12Z" fill="#f6a27a"/>
    <path d="M20 184h144v163H20Z" fill="#ffc69d"/>
    <path d="M37 208h110v28H37Z" fill="#fff6db"/>
    <path d="M37 253h43v85H37Zm59 0h51v85H96Z" fill="#707db7"/>
    <path d="M37 274h43m16 15h51" stroke="#d7e3ff"/>
    <path d="M534 139h134v211H534Z" fill="#a69de4"/>
    <path d="M542 151h118v194H542Z" fill="#beb5f6"/>
    <path d="M554 175h95v33h-95Z" fill="#fff5da"/>
    <path d="M555 227h41v111h-41Zm54 0h40v111h-40Z" fill="#6b80b1"/>
    <path d="M555 255h41m13 20h40" stroke="#d7e3ff"/>
    <path d="M165 132h365v226H165Z" fill="#fdf4d8"/>
    <path d="M154 123h387v15H154Z" fill="#ffcb6a"/>
    <path d="M179 152h337v54H179Z" fill="${b.color}"/>
    <path d="M180 215h335l17 38H163Z" fill="#fff4d9"/>
    <path d="m204 215-8 38h27l5-38m32 0-2 38h28v-38m31 0 2 38h28l-4-38m32 0 7 38h28l-10-38m32 0 12 38h28l-15-38" fill="${b.color}" stroke="none"/>
    <path d="M163 253v10c0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 24 12 24 0 0 12 33 12 33 0v-10Z" fill="${b.color}"/>
    <path d="M184 281h106v65H184Zm219 0h107v65H403Z" fill="#809ed1"/>
    <path d="M301 277h92v81h-92Z" fill="${b.color}"/>
    <path d="M312 286h70v49h-70Z" fill="#afc9ef"/>
    <path d="m198 284 47 59m179-59 47 59" stroke="#cde0ff" stroke-width="12"/>
    <path d="M375 341v9" stroke="#ffcb6a" stroke-width="4"/>
    <rect x="327" y="299" width="40" height="19" rx="4" fill="#fff5da"/>
    <path d="M160 358h376v12H160Z" fill="#ffcb6a"/>
    <path d="M562 331v50m-11-35h23" stroke="#26324f" stroke-width="4"/>
    <path d="M546 331h36l-4 39h-28Z" fill="#ff9b72"/>
    <path d="M583 330v-70" stroke="#26324f" stroke-width="5"/>
    <ellipse cx="584" cy="248" rx="27" ry="42" fill="#3b9c85"/>
    <ellipse cx="610" cy="267" rx="21" ry="30" fill="#7fc09c"/>
    <path d="M582 274v75m0-50 20-18"/>
    <path d="M121 330h27v37h-27Z" fill="#c47b63"/><path d="M134 330v-34m0 17-17-13m17 5 16-19" stroke="#287a66" stroke-width="7"/>
    <path d="m54 361 13-33h36l12 33Z" fill="#fff5da"/><path d="M67 341h36m-39 10h42"/>
  </g>
  <g font-family="Arial,sans-serif" text-anchor="middle" font-weight="700">
    <text x="347" y="185" font-size="22" fill="#fff">${safe(b.sign)}</text>
    <text x="92" y="226" font-size="8" fill="#26324f" letter-spacing="1">THE BOOK ROOM</text>
    <text x="602" y="195" font-size="9" fill="#26324f" letter-spacing="1">THE STUDIO</text>
    <text x="347" y="312" font-size="9" fill="#26324f">OPEN</text>
  </g>
  <g fill="#26324f"><circle cx="237" cy="314" r="12"/><path d="M226 309h22v10c0 12-22 12-22 0Zm22 2h5v10h-5" fill="#fff0c6"/><path d="M231 302v-6m9 6v-6" stroke="#fff0c6" stroke-width="2"/></g>
  <g fill="#ffe099"><path d="m461 295 4 8 9 2-7 6 1 10-7-5-8 5 2-10-7-6 9-2Z"/></g>
  <ellipse cx="355" cy="383" rx="166" ry="5" fill="#26324f" opacity=".12"/>
  </svg>`;
}

function previewRecord(b) {
  return `<div class="lp-player" style="--biz:${b.color}">
    <div class="lp-player-top"><span class="lp-chip"><i></i>${safe(b.name)}</span><span>CH 2 · Keep Your Own Books</span><span class="lp-step">Task 6 of 14</span></div>
    <div class="lp-decision"><span class="lp-label">TRANSACTION</span><p>Supplies were delivered on account from <strong>${safe(b.invoice)}</strong>. Record the purchase.</p></div>
    <table class="lp-journal"><thead><tr><th>Date</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>
      <tr><td>Mar 4</td><td>Supplies</td><td>${b.amount}</td><td></td></tr>
      <tr><td></td><td class="lp-cr">Accounts Payable</td><td></td><td>${b.amount}</td></tr>
      <tr class="lp-total"><td></td><td>Totals</td><td>${b.amount}</td><td>${b.amount}</td></tr></tbody></table>
    <div class="lp-posted">${laneIcon('check', 16)} Entry balanced and posted to the ledger</div>
    <div class="lp-taccts"><div><b>Supplies</b><span>${b.amount}</span><span></span></div><div><b>Accounts Payable</b><span></span><span>${b.amount}</span></div></div>
  </div>`;
}

function publicWelcome() {
  const b = previewBusinesses[previewBusiness];
  const units = [
    ['Unit 1 · Foundations', ['Business forms and the financial statements', 'Recording transactions', 'Adjusting and closing entries', 'Cumulative review']],
    ['Unit 2 · Operating the business', ['Cash and internal control', 'Receivables', 'Merchandise inventory', 'Long-term assets', 'Cumulative review']],
    ['Unit 3 · Growing the business', ['Current liabilities and payroll', 'Long-term debt', 'Stockholders’ equity', 'Statement of cash flows', 'Cumulative review']],
    ['Final project', ['A full year of operations: monthly entries, adjustments, closing and all four statements']],
  ];
  return `<div class="lp">
  <section class="lp-hero">
    <div class="lp-hero-copy">
      <span class="lp-eyebrow">INTRODUCTORY FINANCIAL ACCOUNTING</span>
      <h1>Students run a business. Then they account for it.</h1>
      <p>Ledger Lane is a full semester of prebuilt lessons. Each student creates a business, makes its operating decisions and records the results in a real general journal, from the first stock issue to year-end financial statements.</p>
      <div class="lp-actions"><button id="student" class="lp-btn">Start your business ${laneIcon('arrow', 18)}</button><button id="instructor-demo" class="lp-btn alt">Browse the lesson library</button></div>
      <p class="lp-note">Try a sample lesson free, no account needed. Your class account opens the full course. <button id="professor" class="lp-link">Instructor sign in →</button></p>
    </div>
    <div class="lp-hero-visual">
      <div id="welcome-scene">${previewRecord(b)}</div>
      <div class="lp-switch"><span>Preview as <strong id="preview-business-name">${safe(b.name)}</strong> <em id="preview-business-item">${safe(b.item)}</em></span><div role="group" aria-label="Preview a business">${Object.entries(previewBusinesses).map(([id, x]) => `<button class="${previewBusiness === id ? 'selected' : ''}" data-preview-business="${id}" aria-pressed="${previewBusiness === id}">${safe(x.type)}</button>`).join('')}</div></div>
    </div>
  </section>
  <section class="lp-stats"><div><strong>11</strong><span>chapter lessons</span></div><div><strong>3</strong><span>cumulative reviews</span></div><div><strong>1</strong><span>year-long final project</span></div><div><strong>20–30</strong><span>minutes per lesson</span></div></section>
  <section class="lp-section">
    <span class="lp-eyebrow">HOW A LESSON WORKS</span><h2>Every lesson follows the same business</h2>
    <div class="lp-steps">
      <article><span>1</span><h3>Create the business</h3><p>Students choose a business type and name it in Chapter 1. The same business carries through every lesson of the semester.</p></article>
      <article><span>2</span><h3>Make the decisions</h3><p>Each lesson opens with an operating decision, such as hiring staff, offering credit terms or financing an expansion. Those choices determine the transactions.</p></article>
      <article><span>3</span><h3>Record and report</h3><p>Students write general-journal entries, see them post to T accounts and prepare the statements. Feedback identifies the specific error.</p></article>
    </div>
  </section>
  <section class="lp-section">
    <span class="lp-eyebrow">COURSE COVERAGE</span><h2>Aligned to the introductory course sequence</h2>
    <div class="lp-units">${units.map(([u, items]) => `<article><h3>${u}</h3><ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul></article>`).join('')}</div>
  </section>
  <section class="lp-teach"><div><span class="lp-eyebrow">FOR INSTRUCTORS</span><h2>Ready to assign on day one</h2><p>Preview any lesson as a student, then assign it to your class with a due date. Chapter lessons take 20–30 minutes, cumulative reviews 45–60 minutes, and every lesson is graded on first-attempt accuracy.</p></div><button id="explore-studio" class="lp-btn light">Open the lesson library ${laneIcon('arrow', 18)}</button></section>
  <footer class="lp-footer"><span><strong>Ledger Lane</strong> · Financial accounting, taught through a business students run</span><a href="lessons.html#library">All 15 lessons →</a></footer>
  </div>`;
}

function wireWelcome() {
  const signedIn = typeof cloudAccount !== 'undefined' && cloudAccount;
  const openStudio = () => { location.href = 'lessons.html#library'; };
  if (Q('#instructor-demo')) { Q('#instructor-demo').hidden = !!signedIn; Q('#instructor-demo').onclick = openStudio; }
  if (Q('#explore-studio')) { Q('#explore-studio').hidden = !!signedIn; Q('#explore-studio').onclick = openStudio; }
  document.querySelectorAll('[data-preview-business]').forEach((button) => (button.onclick = () => {
    previewBusiness = button.dataset.previewBusiness;
    const b = previewBusinesses[previewBusiness];
    Q('#welcome-scene').innerHTML = previewRecord(b);
    Q('#preview-business-name').textContent = b.name;
    Q('#preview-business-item').textContent = b.item;
    document.querySelectorAll('[data-preview-business]').forEach((el) => {
      el.classList.toggle('selected', el === button);
      el.setAttribute('aria-pressed', String(el === button));
    });
  }));
}
