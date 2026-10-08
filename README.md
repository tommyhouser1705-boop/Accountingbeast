# Ledger Lane

A browser classroom for introductory financial accounting. Students keep one business identity across independent topic assignments. The September–December comprehensive simulation remains available at `capstone.html`.

## Development and publication

Requires Node.js 22 or newer. No dependencies or credentials are required.

- `npm start`: serves the application on port 3000 (or `PORT`).
- `npm test`: runs accounting engine and assignment tests.
- `npm run build`: generates standalone classroom and capstone pages in `docs/`.

GitHub Pages publishes `main` → `/docs`. Rebuild before publishing source changes. Both generated pages run without external scripts or fonts. For offline testing, keep `docs/index.html` and `docs/capstone.html` together.

## Independent classroom assignments

Professors upload TXT/Markdown notes or paste text, select a topic, edit instructions/date/support, and review sample documents and the answer key before approving an assignment. Notes use keyword matching to suggest a tested template; no AI service is connected. Four supported topics: prepaid rent, credit sales/collections, equipment/depreciation, and owner investment/cash expenses. Download the approved JSON assignment and distribute it through an LMS; students import that file.

Students create a coffee shop, design studio, or bike repair business. Each assignment starts with its own verified balances and snapshots the business and assignment settings. Students make bounded business choices, inspect receipts/invoices/registers, write dated journal entries, and can advance business events before bookkeeping. Their latest entries appear in T accounts. One conceptual prediction and three financial effects connect the entries to their meaning. Completion requires corrected entries and financial effects; first-attempt grading remains: journal accounts/amounts/dates 80%, financial effects 15%, prediction 5%. Downloadable portfolios contain work and scores.

## Comprehensive simulation

The business opens September 1, 2026 and runs through December. Business-specific supply/equipment/advertising packages and locations explain their effects. Owner/investor capital can fund purchases. Records include credit purchases, subsequent payments, customer advances, earned revenue, prepaid rent, depreciation and accrued wages. Students reconcile cash to bank statements, prepare financial statements, close the short first accounting year, and pass an audit. The ledger uses T accounts. Legacy managerial scripts remain in the repository but are inactive.

## Connected classroom pilot

The account system is implemented in `cloud.js`, `cloud-client.js`, and `supabase/`. Owners approve professor/student emails; professors create classes, invite students, publish reviewed assignments, and inspect a server gradebook and submission history. Students save business profiles and submitted work to their account. Server grading and atomic revisions protect first attempts and prevent stale overwrites.

Live account hosting is not configured until `cloud-config.js` contains a Supabase project URL and public publishable key, and the migration/Edge Function are deployed. Until then, Sign in shows an accurate setup notice and browser practice stays available. See [the setup guide](account-setup.html) and [backend setup details](supabase/README.md). Do not put a secret key in browser configuration.

## Practice-mode limits

In disconnected practice mode, profiles, assignments, and progress are stored in localStorage on the current browser. This mode has no authenticated accounts, shared gradebook, or server grading. Connected classes require the Supabase setup above. Exported grades are student-controlled and not tamper-proof. Clearing browser storage loses saved work. Professor publishing adds an assignment locally; sharing requires its JSON file. TXT/Markdown uploads are supported; paste extracted text from PDFs or slides. Business economics and source documents are simplified teaching scenarios. Topic assignments deliberately isolate transactions rather than simulate a full operating month. The comprehensive simulation retains its separate saved progress.
