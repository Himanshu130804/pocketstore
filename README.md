# PocketStore

PocketStore is a multi-tenant MERN web platform for local shops and their customers. It combines public shop listings, flexible fulfilment, online orders, inventory, POS billing, secure digital invoices, customer bill history, owner retention controls, shop approvals and platform administration.

## Included MVP

- Email or phone registration with development OTP support
- Customer and shop-owner self-registration
- No public administrator registration
- Initial Super Admin bootstrapped from backend environment variables
- Super Admin promotion and removal of Platform Admin access
- User activate, deactivate, suspend, ban and unban controls
- Shop submission, approval, activation, deactivation, suspension and ban controls
- Sensitive shop edits through an approval queue
- Public shops and product listings
- Fulfilment modes: walk-in, pickup, delivery, reserve, express pickup and preorder
- Customer online orders
- Owner order dashboard and POS-order endpoint
- Atomic sale completion using MongoDB transactions
- Inventory reduction and invoice generation
- Public invoice links for registered and unregistered customers
- Customer invoice vault
- Shop-specific customer purchase history with retention date
- Audit-log foundation
- Responsive customer, owner and admin web interfaces

## First setup

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Configure `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
SUPER_ADMIN_NAME=Your Name
SUPER_ADMIN_EMAIL=your_admin_email@example.com
SUPER_ADMIN_PASSWORD=YourStrongPassword123!
CLIENT_URL=http://localhost:5173
```

Start the backend:

```powershell
npm run dev
```

The first Super Admin is created once from the environment variables when no Super Admin exists. No demo customer, owner, shop or product accounts are generated.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Administrator rules

- The initial Super Admin is created only from the backend environment configuration.
- There is no public admin registration page.
- Only the Super Admin can promote a verified, active user to Platform Admin.
- Only the Super Admin can remove Platform Admin access.
- Removing admin access restores the user’s previous customer or shop-owner role.
- Admin role or account changes revoke existing login tokens.
- An administrator cannot suspend or demote their own account through the admin interface.
- Every sensitive administrator action is recorded in audit logs.

## Important

The development OTP is returned by the API outside production. Replace it with a real SMS or email provider before launch. MongoDB transactions require MongoDB Atlas or a replica set. The invoice-delivery workflow currently returns a secure public link; integrate SMS and email providers in a later phase.

## PocketStore dashboard update

This build includes a redesigned customer marketplace, responsive navigation, a complete shop-owner dashboard layout, separate owner pages for products, orders/POS and settings, and a platform-admin dashboard with overview, approvals, shops and user/admin management. New UI components and pages use colocated CSS files. The visual hierarchy is inspired by modern commerce interfaces while retaining original PocketStore branding.

## Recent portal additions
- Customer dashboard, wishlist, notifications, addresses, reviews, support, settings, editable profile and profile photo.
- Owner dashboard, products, POS/orders, customers, reports, editable shop, shop logo/cover uploads and owner profile.
- Platform administration for approvals, shops, products, orders, users/admins, analytics, audit logs and settings.

Uploaded images are stored locally in `backend/uploads` for development and exposed under `/uploads`. Use Cloudinary, S3 or another managed object store before production deployment.


## SMS OTP setup
PocketStore uses MSG91 for registration and password-reset OTP messages. Add MSG91 credentials to `backend/.env`. For local testing only, set `SMS_DEV_MODE=true`; the OTP will be logged by the backend and returned to the development frontend. Never enable development OTP mode in production. Password recovery sends an OTP and lets the user set a new password; existing passwords are never sent or revealed.

## MSG91 real SMS OTP setup

PocketStore now uses MSG91 for real registration and password-reset OTP messages.

Add the following values to `backend/.env`:

```env
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_TEMPLATE_ID=your_msg91_otp_template_id
MSG91_OTP_LENGTH=6
MSG91_OTP_EXPIRY_MINUTES=10
SMS_DEV_MODE=false
```

The OTP template must be created and approved inside the MSG91 OTP dashboard. Mobile numbers are sent in international format with the Indian country code (`91`).

For temporary local testing without consuming SMS credits:

```env
SMS_DEV_MODE=true
DEV_OTP=123456
```

Never enable development OTP mode in production.

## SMS works before you create an MSG91 account

PocketStore defaults to a built-in mock SMS provider. Add this to `backend/.env`:

```env
SMS_PROVIDER=mock
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
DEV_OTP=
EXPOSE_DEV_OTP=false
```

Request an OTP from the website and read the randomly generated code in the backend terminal. Later, create an MSG91 account and switch only the environment variables:

```env
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_auth_key
MSG91_TEMPLATE_ID=your_template_id
MSG91_FLOW_ID=your_optional_transactional_flow_id
```

No frontend, route, controller, or database changes are required. See `docs/MSG91_SETUP.md` and `docs/SMS_ARCHITECTURE.md`.

## Development OTP display

With `SMS_PROVIDER=mock`, PocketStore returns the generated OTP only to the local frontend and displays it on the registration and forgot-password pages. The OTP is also printed in the backend terminal. The database stores only its bcrypt hash.

When MSG91 is configured later, change `SMS_PROVIDER=msg91`; the provider does not return an OTP to the browser, so the development OTP card automatically disappears.

## Product-ready UI update

This edition adds usability improvements across all three portals:

- Collapsible desktop sidebar for Owner and Admin workspaces.
- Mobile slide-out navigation with an overlay and close controls.
- Customer account slide-out menu on tablets and phones.
- Route-aware page titles in dashboard headers.
- Improved loading, empty, error, retry and confirmation states.
- Safer asynchronous page loading to avoid React cleanup errors such as `destroy is not a function`.
- Dedicated CSS files for customer Addresses, Reviews and Support pages.
- Development OTP is displayed only while the mock SMS provider is active.
- MSG91 can be enabled later through environment variables without frontend changes.

### Important scope note

This repository is a working MERN product foundation. Advanced modules listed in the roadmap—such as payment gateway integration, GST invoicing, multi-shop checkout, full supplier purchasing, delivery tracking and cloud media storage—still require provider credentials and further implementation before a public production launch.

## Commerce Core (Phase 1)

This version includes global relevance search, product details, variants, product media, a persistent multi-shop cart and customer checkout. See `docs/PHASE1_COMMERCE_CORE.md` for the exact scope.

For image URLs in local development, the frontend defaults to `http://localhost:5000`. You may explicitly add this to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_API_ORIGIN=http://localhost:5000
```

## Phase 2 shop operations

The owner portal now contains Point of Sale, inventory ledger, suppliers, purchase orders, khata, expenses/profit, returns/refunds and invoices.

For invoice PDF output, open an invoice and use the browser's **Print → Save as PDF** option.

## Phase 3 — Teams, Multiple Shops and Delivery

This edition adds:

- Employee invitation links for existing verified users
- Manager, cashier, inventory manager, accountant and delivery staff roles
- Role-specific permissions and separate employee workspace
- Employee activation/revocation and role changes
- Multiple shops per owner with a persistent shop switcher
- Shop-isolated employee memberships
- Delivery staff assignment and delivery status workflow
- Pickup verification code generation
- Separate owner pages for Employees, Deliveries and My Shops

### Employee onboarding

1. The shop owner opens **Owner → Employees**.
2. Enter the employee's verified PocketStore email or phone and select a role.
3. Share the generated invitation link.
4. The employee logs in using the matching account and opens the invitation link.
5. After accepting, the employee uses `/employee` and sees only their allowed workspace.

No employee password is shared with the owner.


## Phase 4 governance
The admin portal now includes permissions, complaints, review/category moderation, announcements, risk signals, exports, persistent feature flags, maintenance mode and expanded audit logs. See `docs/PHASE_4.md`.

## Final audited interface release

This version includes the consolidated UI/UX audit in `docs/FINAL_UI_UX_AUDIT.md`.

Before starting development, validate the source tree:

```bash
node validate-project.mjs
```

The owner portal now displays the selected shop and its approval state on every page. Use the top-bar **Quick action** menu for common operations such as adding a product, creating a bill, inviting an employee, or creating a purchase.

## Gen-Z Classic UI release

This release replaces the previous indigo/gray visual system with a warmer marketplace identity:

- Ivory commerce canvas
- Midnight dashboard navigation
- Violet-to-coral primary gradients
- Mint success feedback and lime micro-accents
- Softer glass-like cards and stronger content hierarchy
- Reworked responsive header, search, category navigation, dashboards and forms

Run the static validator from the `ps_final` directory:

```powershell
node validate-project.mjs
```

The validator now works correctly on Windows paths.

## Shop Live / Offline control

Admin approval and customer visibility are separate. After a shop is approved, the owner can use the **Go live** toggle in the owner top bar or Shop Settings.

- **Live:** customers can discover the shop, browse published products, and place orders.
- **Offline:** the shop disappears from the customer marketplace and online orders are blocked, while the owner can continue using POS, inventory, products, employees, suppliers, purchases, khata, expenses, and reports.

New shops start offline after approval so the owner can finish preparing the catalogue before publishing.

## Location and service-radius setup

Customers can detect their live location or search and save an address manually. Shop owners must pin the exact shop location and choose a service radius before making the shop live. Customer discovery, global search, shop/product access, and checkout are validated against that radius on the backend. See `docs/LOCATION_SERVICE.md`.

## Strengthened Showcase Release

This release adds a dynamic location-aware homepage, role-specific activity timelines, global toast feedback, improved marketplace empty/loading states, and frontend vendor chunking. Run:

```powershell
node validate-project.mjs
```

before starting the application. See `docs/STRENGTHENING_AUDIT.md` for the demonstration workflow and validation boundary.
