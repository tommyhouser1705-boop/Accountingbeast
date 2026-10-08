# Ledger Lane

A browser classroom for introductory financial accounting. Students keep one business identity across independent topic assignments. The September–December comprehensive simulation remains available at `capstone.html`.

## Development and publication

Requires Node.js 22.13 or newer. Run `npm ci` to install the pinned document readers and deployment dependencies. Practice mode requires no credentials.

- `npm start`: serves the application on port 3000 (or `PORT`).
- `npm test`: runs accounting engine and assignment tests.
- `npm run build`: generates standalone classroom and capstone pages in `docs/`.

GitHub Pages publishes `main` → `/docs`. Rebuild before publishing source changes. Both generated pages run without external scripts or fonts. For offline testing, retain the `docs/assets/` readers alongside the pages; PDF/Word imports require serving the folder over HTTP.

## Independent classroom assignments

Professors upload PDF, DOCX, TXT, or Markdown notes, or paste course text. The local notes compiler extracts evidenced concepts and composes an independent version-2 episode with up to six decision areas, setup/operations/month-end stages, stable student-specific amounts, and business-specific source records. Professor review shows source passages, excluded topics, conventions, documents, expected journal entries, and financial answers before publishing to a class. Episode length controls additional operating activity; reporting can remain topic-specific or include income statement and balance sheet totals. Generated assignments are new instances, not selections from the former four-assignment library.

Supported accounting rules: prepaid rent, prepaid insurance, supplies counts, receivables/collections, straight-line depreciation, owner funding/advertising, customer deposits/delivery, wages accruals, utilities accruals, credit purchases/supplier settlements, loans/simple interest, owner drawings, and delivered cash services. This is a compositional rules engine, not an external language model. It does not interpret arbitrary accounting methods or instructor example amounts. Unsupported subjects (including inventory valuation, bank reconciliation, closing entries, corporate equity, and other depreciation methods) are flagged for professor review. Bank reconciliation and closing remain available in the separate comprehensive game. Scanned PDFs need readable text; PPTX notes can be pasted. File size is limited to 10 MB, PDF page count to 80, and extracted notes to 30,000 characters.

Students design one of ten business types using a live preview, six brand colors, three storefront styles, neighborhoods, symbols, specialties, and a tagline. The profile is saved across devices for connected accounts. Each assignment snapshots that identity and begins with its own verified balances. Operating choices create realistic receipts, invoices, registers, counts, and unpaid bills. Students can advance the business without completing journal entries. Dated entries feed T accounts and the assigned financial report. First-attempt grades remain journal accounts/amounts/dates 80%, financial effects 15%, concept check 5%; business profit and appearance do not affect grades. Existing version-1 assignments and submissions remain supported.

## Comprehensive simulation

The business opens September 1, 2026 and runs through December. Business-specific supply/equipment/advertising packages and locations explain their effects. Owner/investor capital can fund purchases. Records include credit purchases, subsequent payments, customer advances, earned revenue, prepaid rent, depreciation and accrued wages. Students reconcile cash to bank statements, prepare financial statements, close the short first accounting year, and pass an audit. The ledger uses T accounts. Legacy managerial scripts remain in the repository but are inactive.

## Connected classroom pilot

The account system is implemented in `cloud.js`, `cloud-client.js`, and `supabase/`. Owners approve professor/student emails; professors create classes, invite students, publish reviewed assignments, and inspect a server gradebook and submission history. Students save business profiles and submitted work to their account. Server grading and atomic revisions protect first attempts and prevent stale overwrites.

The Supabase project URL and public browser key are configured. The database, owner approval, and Edge Function have been deployed and the hosted server readiness check has passed. Changes to server rules must be deployed with the frontend; the GitHub workflow handles this on pushes to main. Browser practice stays available. See [the setup guide](account-setup.html) and [backend setup details](supabase/README.md). Do not put a secret key in browser configuration.

## Practice-mode limits

In disconnected practice mode, profiles, assignments, and progress are stored in localStorage on the current browser. This mode has no authenticated accounts, shared gradebook, or server grading. Connected classes require the Supabase setup above. Exported grades are student-controlled and not tamper-proof. Clearing browser storage loses saved work. Professor publishing adds an assignment locally; sharing requires its JSON file. PDF/DOCX/TXT/Markdown uploads are supported; paste text from slides. Business economics and source documents are simplified teaching scenarios. Topic assignments deliberately isolate transactions rather than simulate a full operating month. The comprehensive simulation retains its separate saved progress.
