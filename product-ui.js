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
    <div class="lp-player-top"><span class="lp-chip"><i></i>${safe(b.name)}</span><span>CH 2 · Launch Month</span><span class="lp-step">Task 6 of 14</span></div>
    <div class="lp-decision"><span class="lp-label">TRANSACTION</span><p>Supplies were delivered on account from <strong>${safe(b.invoice)}</strong>. Record the purchase.</p></div>
    <table class="lp-journal"><thead><tr><th>Date</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>
      <tr><td>Mar 4</td><td>Supplies</td><td>${b.amount}</td><td></td></tr>
      <tr><td></td><td class="lp-cr">Accounts Payable</td><td></td><td>${b.amount}</td></tr>
      <tr class="lp-total"><td></td><td>Totals</td><td>${b.amount}</td><td>${b.amount}</td></tr></tbody></table>
    <div class="lp-posted">${laneIcon('check', 16)} Entry balanced and posted to the ledger</div>
    <div class="lp-taccts"><div><b>Supplies</b><span>${b.amount}</span><span></span></div><div><b>Accounts Payable</b><span></span><span>${b.amount}</span></div></div>
  </div>`;
}

const courseContents = [
  ['Ch 1', 'Open Your Doors', '20–25 min'], ['Ch 2', 'Keep Your Own Books', 'Free sample'], ['Ch 3', 'Close Out the Year', '25–30 min'], ['Review 1', 'Full Cycle: One Month', '45–60 min'],
  ['Ch 4', 'Protect Your Cash', '20–25 min'], ['Ch 5', 'Sell on Credit', '25–30 min'], ['Ch 6', 'Launch a Product Line', '25–30 min'], ['Ch 7', 'Buy a Vehicle', '25–30 min'], ['Review 2', 'Holiday Quarter', '45–60 min'],
  ['Ch 8', 'Hire Your Team', '25–30 min'], ['Ch 9', 'Finance an Expansion', '25–30 min'], ['Ch 10', 'Bring In Investors', '25–30 min'], ['Ch 11', 'Where Did the Cash Go?', '20–25 min'], ['Review 3', 'Fund the Next Stage', '45–60 min'],
  ['Final', 'Your First Full Year', '120–150 min'],
];

function screenshot(file, alt, bar = true) {
  return `<figure class="hp-frame">${bar ? '<div class="hp-bar"><i></i><i></i><i></i></div>' : ''}<img src="assets/screens/${file}" alt="${alt}" loading="lazy"></figure>`;
}

function feature(id, kicker, title, text, points, visual, flip, extra = '') {
  return `<section class="hp-feat${flip ? ' flip' : ''}"${id ? ` id="${id}"` : ''}><div class="hp-txt"><p class="hp-kicker">${kicker}</p><h2>${title}</h2><p>${text}</p><ul class="hp-ticks">${points.map((x) => `<li>${x}</li>`).join('')}</ul>${extra}</div>${visual}</section>`;
}

function publicWelcome() {
  return `<div class="hp">
  <nav class="hp-nav"><div class="hp-wrap"><a class="hp-logo" href="#">Ledger Lane</a><a class="hp-nl" href="#how">How it works</a><a class="hp-nl" href="#contents">Course</a><a class="hp-nl" href="#instructors">For instructors</a><button class="hp-btn ghost sm" data-signin>Sign in</button><button class="hp-btn sm" data-sample>Try a sample lesson</button></div></nav>
  <header class="hp-hero"><div class="hp-wrap"><div>
    <h1>Students run a business. Then they account for it.</h1>
    <p class="hp-lead">Ledger Lane is an introductory financial accounting course where every student starts a company, makes its decisions all semester, and records the results in a real general journal.</p>
    <div class="hp-actions"><button id="student" class="hp-btn">Try a sample lesson</button><button id="professor" class="hp-btn ghost">Instructor sign in</button></div>
    <p class="hp-small">The sample is Chapter 2 and takes about 25 minutes. No account needed.</p></div>
    <div class="hp-collage">${screenshot('decision.jpg', 'A lesson: choosing equipment and marketing for the business')}<div class="hp-float">${screenshot('journal-feedback.jpg', 'A journal entry with feedback on the error', false)}</div></div>
  </div></header>
  <div class="hp-facts"><div class="hp-wrap"><span><b>11</b> chapter lessons</span><span><b>3</b> cumulative reviews</span><span><b>1</b> year-long final project</span><span>Graded on the first attempt</span></div></div>
  <main class="hp-wrap">
  ${feature('how', 'Chapter 1', 'Every student starts a business', 'Students choose what to run and name it. That company is theirs for the semester: it adds a product line, buys a vehicle, hires staff, borrows and brings in investors as the chapters go on.',
    ['Four business types, each with its own revenue and later a product to sell', 'Set up as a corporation from day one: common stock, retained earnings, dividends', 'The business name and past decisions carry into every lesson'],
    screenshot('create-business.jpg', 'Creating the business'), false)}
  ${feature('', 'Every lesson', 'Decisions that change the numbers', 'Each lesson opens with real choices: which equipment to buy, how to market, whether to offer credit, how to finance an expansion. Students see the expected revenue and cash before they commit.',
    ['Different choices produce different transactions to record', 'No two students work from the same answer key', 'The accounting stays the focus; the decisions give it a reason'],
    screenshot('decision.jpg', 'Business decisions in a lesson'), true)}
  ${feature('', 'The core skill', 'Real journal entries, with feedback that teaches', 'Students write general journal entries the way the course expects: date, accounts from the chart, debits and credits, compound entries. When something is off, the feedback says what and why.',
    ['Flags the wrong side, a wrong account, a wrong amount or an unbalanced entry', 'T accounts and the accounting equation update the moment an entry posts', 'Adjusting entries, closing entries, trial balances and statements follow'],
    `<div class="hp-pair">${screenshot('journal-feedback.jpg', 'Journal entry feedback', false)}${screenshot('ledger.jpg', 'T accounts updating after an entry posts', false)}</div>`, false)}
  ${feature('instructors', 'For instructors', 'Assign it Monday. Grades are in by Friday.', 'Create a class, add students by email and assign lessons with due dates. Scores arrive in your gradebook as students submit, with no answer keys to check by hand.',
    ['Prebuilt lessons for every chapter, ready to assign', 'First-attempt scores, so practice afterwards doesn’t change the grade', 'Preview any lesson as a student; export the gradebook to CSV'],
    screenshot('gradebook.jpg', 'Instructor gradebook'), true,
    '<p class="hp-actions"><button class="hp-btn ghost" data-signin>Instructor sign in</button><button id="explore-studio" class="hp-link">Browse the lesson library</button></p>')}
  <section class="hp-sec"><h2>How a lesson works</h2><div class="hp-steps">
    <div><b>1. The situation</b><span>A month in the life of the student’s business: what happened and what’s at stake.</span></div>
    <div><b>2. The decision</b><span>Students pick a course of action and see the expected effect on revenue and cash.</span></div>
    <div><b>3. The entries</b><span>They journalize each transaction; the ledger and equation update as they post.</span></div>
    <div><b>4. The close</b><span>Trial balance, adjustments, statements or closing, then a score and a summary.</span></div></div></section>
  <section class="hp-sec" id="contents"><h2>Course contents</h2><p class="hp-muted">Chapter lessons take 20–30 minutes; cumulative reviews 45–60; the final project spans a full year of the business.</p>
    <div class="hp-toc">${courseContents.map(([n, t, m]) => `<div><span><em>${n}</em> ${t}</span><small${m === 'Free sample' ? ' class="free"' : ''}>${m}</small></div>`).join('')}</div>
    <p><button id="instructor-demo" class="hp-link">Open the lesson library</button></p></section>
  </main>
  <section class="hp-cta"><div class="hp-wrap"><div><h2>See a lesson for yourself.</h2><p>Chapter 2 is open to everyone. Instructors can request access to the full course.</p></div><div class="hp-actions"><button class="hp-btn light" data-sample>Try the sample lesson</button><button class="hp-btn outline" data-signin>Instructor sign in</button></div></div></section>
  <footer class="hp-wrap hp-foot">© 2026 Ledger Lane · Introductory financial accounting</footer>
  </div>`;
}

function wireWelcome() {
  const signedIn = typeof cloudAccount !== 'undefined' && cloudAccount;
  const openStudio = () => { location.href = 'lessons.html#library'; };
  for (const id of ['#instructor-demo', '#explore-studio']) if (Q(id)) { Q(id).hidden = !!signedIn; Q(id).onclick = openStudio; }
  document.querySelectorAll('[data-sample]').forEach((b) => (b.onclick = () => Q('#student').click()));
  document.querySelectorAll('[data-signin]').forEach((b) => (b.onclick = () => Q('#professor').click()));
}
