// Product introduction and legacy workspace illustrations.
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
  ['Month 1', 'Opening month', 'Free sample'],
  ['Month 2', 'Earn it, use it, accrue it', 'Accruals & adjustments'],
  ['Month 3', 'Keep control of cash', 'Bank reconciliation'],
  ['Period close', 'First quarter · close the books', 'Statements & closing'],
  ['Month 4', 'Grow without losing collections', 'Receivables & credit'],
  ['Month 5', 'Launch a product line', 'Inventory & cost of goods sold'],
  ['Month 6', 'Put assets to work', 'Fixed assets & depreciation'],
  ['Period close', 'Half-year · audit the business', 'Statements & closing'],
  ['Month 7', 'Pay people and collect tax', 'Payroll & sales tax'],
  ['Month 8', 'Finance the next stage', 'Debt & interest'],
  ['Month 9', 'Bring in an investor', 'Stock & equity'],
  ['Period close', 'Third quarter · report to investors', 'Statements & closing'],
  ['Month 10', 'Show where the cash went', 'Cash-flow reporting'],
  ['Year-end', 'Year-end · hand over the books', 'Adjust, report & close'],
];

function screenshot(file, alt, bar = true, eager = false) {
  return `<figure class="hp-frame">${bar ? '<div class="hp-bar" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}<img src="assets/screens/${file}" alt="${alt}" width="${file === 'instructor-gradebook.jpg' ? 1440 : 1600}" height="${file === 'instructor-gradebook.jpg' ? 900 : 1040}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''}></figure>`;
}

function feature(id, kicker, title, text, points, visual, flip, extra = '') {
  return `<section class="hp-feat${flip ? ' flip' : ''}"${id ? ` id="${id}"` : ''}><div class="hp-txt"><p class="hp-kicker">${kicker}</p><h2>${title}</h2><p>${text}</p><ul class="hp-ticks">${points.map((x) => `<li>${x}</li>`).join('')}</ul>${extra}</div>${visual}</section>`;
}

function publicWelcome() {
  return `<div class="hp">
  <nav class="hp-nav" aria-label="Main navigation"><div class="hp-wrap"><a class="hp-logo" href="#">Ledger Lane</a><a class="hp-nl" href="#how">See the office</a><a class="hp-nl" href="#contents">Course</a><a class="hp-nl" href="#instructors">For instructors</a><button class="hp-btn ghost sm" data-signin>Sign in</button><button class="hp-btn sm" data-sample>Try the simulation</button></div></nav>
  <header class="hp-hero hp-office-hero"><div class="hp-wrap"><div class="hp-intro">
    <p class="hp-subject">A business simulation for introductory accounting</p>
    <h1>Students run a business. Then they account for it.</h1>
    <p class="hp-lead">Their own company. An inbox full of decisions. Realistic invoices, receipts and bank notices. Students run the business day by day, then keep its books in the same workspace.</p>
    <div class="hp-actions"><button id="student" class="hp-btn">Try the opening month</button><a class="hp-btn ghost" href="#how">See the office in action</a></div>
    <p class="hp-small">One sample period. No account needed. Full course access through a class.</p></div>
    <div class="hp-office-shot">${screenshot('office-books.jpg', 'The student office: an equipment invoice in Mail beside its general-journal entry in Books', true, true)}<p class="hp-shot-caption"><span>Mail on the left. Books on the right.</span> Actual platform screenshots · example business and class data.</p></div>
  </div></header>
  <div class="hp-facts"><div class="hp-wrap"><span>One business all semester</span><span>14 simulation periods</span><span>No quizzes or multiple-choice questions</span><span>Graded on the accounting</span></div></div>
  <main class="hp-wrap">
  ${officeDemo()}
  ${feature('students', 'For students', 'Not a new case study. Your business.', 'Choose a bike repair shop, fitness studio, landscaping company or photography studio. Name it, open the office and run it through operating months, quarter-end reviews and year-end.',
    ['Your decisions change the paperwork and the amounts you record', 'The same company, journal and balances carry into later periods', 'A first-visit office guide shows you where to start'],
    screenshot('office-setup.jpg', 'The actual setup screen, with four business types and fields for company name, owner and city'), false)}
  ${feature('', 'The student workspace', 'The document and the books. Together.', 'Read a supplier’s invoice without leaving your journal entry. Mail, Books, Bank and Messages are apps on the owner’s computer, not a maze of separate pages.',
    ['Keep two or three apps side by side on a larger screen', 'Use the app switcher on a phone', 'Post journal entries, inspect the ledger and trial balance, and prepare statements in Books'],
    screenshot('office-books.jpg', 'Realistic vendor paperwork alongside a balanced journal entry in the split-screen office'), true)}
  ${feature('instructors', 'For instructors', 'Assign the next period. See the accounting.', 'Create a class, add your students and assign simulation periods with due dates. Their businesses carry forward; completed periods send first-attempt accounting scores to your gradebook.',
    ['Preview the office and each period before assigning', 'Business decisions aren’t graded; accounting accuracy is', 'Later retries don’t overwrite the first-attempt score'],
    `<div>${screenshot('instructor-gradebook.jpg', 'The current instructor gradebook showing simulation periods, due dates and first-attempt scores for an example class')}<p class="hp-small">Actual instructor interface · illustrative students and scores, not a live class.</p></div>`, false,
    '<p class="hp-actions"><button id="professor" class="hp-btn">Instructor sign in</button><button id="explore-studio" class="hp-link">Browse the period library</button></p>')}
  <section class="hp-sec" id="contents"><h2>A semester in the life of one business.</h2><p class="hp-muted">10 operating months, three quarter-end reviews and a year-end close. Each period adds accounting work to the company students already run.</p>
    <div class="hp-toc">${courseContents.map(([n, t, m]) => `<div><span><em>${n}</em> ${t}</span><small${m === 'Free sample' ? ' class="free"' : ''}>${m}</small></div>`).join('')}</div>
    <p><button id="instructor-demo" class="hp-link">Explore the simulation periods</button></p></section>
  <section class="hp-sec hp-faq" aria-labelledby="hp-questions"><h2 id="hp-questions">Before you step into the office</h2>
    <details><summary>Is this a quiz or a business simulation?</summary><p>A simulation. Students respond to business requests, work from source documents, record journal entries and complete accounting worksheets. There are no multiple-choice knowledge questions.</p></details>
    <details><summary>What happens when a student finishes today’s work?</summary><p>The office shows “Today’s work is finished.” Close up for the day advances to the next business date and brings in new mail and paperwork. At a period boundary, Finish this period opens the report.</p></details>
    <details><summary>What can I try without an account?</summary><p>The opening month is the public sample. Full-course access requires a class account. Instructors sign in to preview the course and assign periods.</p></details>
    <details><summary>What is graded?</summary><p>First-attempt accounting accuracy. Students can make different business decisions without being graded on those choices. Completing an assigned period sends its accounting score to the class gradebook.</p></details>
  </section>
  </main>
  <section class="hp-cta"><div class="hp-wrap"><div><h2>Your office is ready.</h2><p>Start a business and try the opening month. No account needed.</p></div><div class="hp-actions"><button class="hp-btn light" data-sample>Try the simulation</button><button class="hp-btn outline" data-signin>Sign in to your class</button></div></div></section>
  <footer class="hp-wrap hp-foot">© 2026 Ledger Lane · Introductory financial accounting</footer>
  </div>`;
}

const officeDemoSteps = [
  {label: 'Read & reply', title: 'A supplier needs your decision.', text: 'Compare a new equipment package with a used set. Choose a reply in Mail and send it. The business decision changes the paperwork that arrives next.', image: 'office-reply.jpg', alt: 'Mail shows an equipment quote, a used-equipment offer and reply choices for the business owner'},
  {label: 'Record it', title: 'Your decision becomes a transaction.', text: 'The new equipment arrives with an $11,800 invoice. Read it in Mail and record Equipment and Cash in Books, right beside the document.', image: 'office-books.jpg', alt: 'An $11,800 equipment invoice beside a journal entry debiting Equipment and crediting Cash'},
  {label: 'Close the day', title: 'Work finished? Close up for the day.', text: 'The entry is posted and today’s items are handled. The office shows the next date and a clear Close up for the day button. You control when the business moves on.', image: 'office-day-end.jpg', alt: 'Posted equipment paperwork and the general journal, with the Today’s work is finished banner and Close up for the day button'},
  {label: 'New mail arrives', title: 'Tomorrow brings the next business event.', text: 'The calendar advances and new paperwork arrives. This supplier’s price quote isn’t a purchase yet: deciding when no entry is needed is part of keeping the books.', image: 'office-next-day.jpg', alt: 'The following business day, with a new supplier price quote in Mail and the Books entry form beside it'},
];

function officeDemo() {
  const first = officeDemoSteps[0];
  return `<section class="hp-demo hp-sec" id="how" aria-labelledby="hp-demo-title"><div class="hp-demo-head"><div><h2 id="hp-demo-title">See one decision play out.</h2><p>Step through the real office. No sign-in, no saved work.</p></div><button class="hp-btn ghost" id="hp-demo-play" aria-pressed="false" aria-controls="hp-demo-stage">Play short demo</button></div>
    <div id="hp-office-demo" aria-label="Office screenshot demonstration"><div class="hp-demo-steps" role="group" aria-label="Demo steps">${officeDemoSteps.map((s, i) => `<button type="button" data-demo-step="${i}" aria-current="${i === 0 ? 'step' : 'false'}" aria-controls="hp-demo-stage"><span>${i + 1}</span>${s.label}</button>`).join('')}</div>
    <div class="hp-demo-stage" id="hp-demo-stage"><div class="hp-demo-image" tabindex="0" role="region" aria-label="Office screenshot. Scroll horizontally on small screens to see both apps."><img id="hp-demo-image" src="assets/screens/${first.image}" alt="${first.alt}" width="1600" height="1040" loading="lazy"></div><div class="hp-demo-caption" aria-live="polite" aria-atomic="true"><p id="hp-demo-count">Step 1 of ${officeDemoSteps.length} · Screenshot demo</p><h3 id="hp-demo-heading">${first.title}</h3><p id="hp-demo-description">${first.text}</p></div></div>
    <div class="hp-demo-foot"><p>Example business: Spoke &amp; Sprocket. <span class="hp-swipe">Swipe the screenshot to see both apps.</span></p><div><button class="hp-link" id="hp-demo-back" disabled>Previous</button><button class="hp-btn sm" id="hp-demo-next">Next step</button></div></div><p class="hp-small" id="hp-demo-motion" hidden>Automatic playback is off for your reduced-motion setting. Use the steps to explore.</p></div></section>`;
}

let stopOfficeDemo = () => {};
function wireOfficeDemo() {
  stopOfficeDemo();
  const root = Q('#hp-office-demo');
  if (!root) return;
  const play = Q('#hp-demo-play'), prev = Q('#hp-demo-back'), next = Q('#hp-demo-next');
  const buttons = [...root.querySelectorAll('[data-demo-step]')];
  let index = 0, playing = false, timer = null, observer = null;
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function pause() {
    playing = false; clearTimeout(timer); timer = null;
    play.textContent = 'Play short demo'; play.setAttribute('aria-pressed', 'false');
    document.removeEventListener('visibilitychange', onVisibility);
    observer?.disconnect(); observer = null;
  }
  function show(value) {
    index = Math.max(0, Math.min(value, officeDemoSteps.length - 1));
    const step = officeDemoSteps[index], img = Q('#hp-demo-image');
    img.src = 'assets/screens/' + step.image; img.alt = step.alt;
    Q('#hp-demo-count').textContent = `Step ${index + 1} of ${officeDemoSteps.length} · Screenshot demo`;
    Q('#hp-demo-heading').textContent = step.title;
    Q('#hp-demo-description').textContent = step.text;
    buttons.forEach((b, i) => b.setAttribute('aria-current', i === index ? 'step' : 'false'));
    prev.disabled = index === 0; next.disabled = index === officeDemoSteps.length - 1;
  }
  function onVisibility() { if (document.hidden) pause(); }
  function tick() {
    if (!root.isConnected || document.hidden || reduced()) return pause();
    show(index + 1);
    if (index === officeDemoSteps.length - 1) pause(); else timer = setTimeout(tick, 5000);
  }
  function refreshMotion() {
    play.hidden = reduced(); Q('#hp-demo-motion').hidden = !reduced();
  }
  refreshMotion();
  play.onclick = () => {
    if (playing || reduced()) { pause(); refreshMotion(); return; }
    if (index === officeDemoSteps.length - 1) show(0);
    playing = true; play.textContent = 'Pause demo'; play.setAttribute('aria-pressed', 'true');
    document.addEventListener('visibilitychange', onVisibility);
    if (window.IntersectionObserver) {
      observer = new window.IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); });
      observer.observe(root);
    }
    timer = setTimeout(tick, 5000);
  };
  buttons.forEach((b, i) => b.onclick = () => { pause(); show(i); });
  prev.onclick = () => { pause(); show(index - 1); };
  next.onclick = () => { pause(); show(index + 1); };
  root.closest?.('.hp')?.addEventListener('click', e => {
    if (e.target.closest('a, [data-signin], [data-sample], #student, #professor, #instructor-demo, #explore-studio')) pause();
  });
  stopOfficeDemo = pause;
}

function wireWelcome() {
  const signedIn = typeof cloudAccount !== 'undefined' && cloudAccount;
  const openStudio = () => { location.href = 'lessons.html#library'; };
  for (const id of ['#instructor-demo', '#explore-studio']) if (Q(id)) { Q(id).hidden = !!signedIn; Q(id).onclick = openStudio; }
  document.querySelectorAll('[data-sample]').forEach((b) => (b.onclick = () => Q('#student').click()));
  document.querySelectorAll('[data-signin]').forEach((b) => (b.onclick = () => Q('#professor').click()));
  wireOfficeDemo();
}
