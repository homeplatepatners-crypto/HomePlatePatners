# HomePlate — Homemade food. Local kitchens. A taste of home.

Hyperlocal homemade food marketplace for Coimbatore: customers discover verified home kitchens
within 5 km, order today's homemade menu, or request a custom dish and pick the best quote.

Three portals on one backend:

| Portal | URL | Login |
|---|---|---|
| Customer | `/` → Login | sign-up with name + mobile OTP + email; login with mobile OTP |
| Kitchen Owner | `/kitchen/register` | sign-up with OTP, then 6-step onboarding + admin approval |
| Super Admin | `/admin/login` | `owner` / `owner` (the only built-in account - change it before going live) |

App URL: **http://localhost:5173** (backend API on http://localhost:8090).
Testing without SMS: any mobile **9000000002 - 9000000999** accepts OTP **123456**.

## Get the code

```bash
git clone https://github.com/homeplatepatners-crypto/HomePlatePatners.git
cd HomePlatePatners
git checkout dinesh/homeplate-dev
```

## Run it

Requirements: JDK 17+, Node 18+, MySQL running on `localhost:3306`.

1. **Backend** (port **8090** — 8080 is used by another app on this machine)
   Double-click `start-backend.bat`, or:
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run      # Windows (PowerShell / CMD)
   ./mvnw spring-boot:run          # Git Bash / macOS / Linux
   ```
   No Maven install needed - the Maven Wrapper downloads it on first run. Only a JDK 17+ is required
   (`java -version` must work; if not, set `JAVA_HOME` to the JDK folder).
   The database `homeplate` is created automatically on first start with only the super admin and subscription plans.
   For a demo with sample kitchens/customers/orders start once with `SEED_DEMO_DATA=true` on an empty database
   (demo logins: `kitchenowner`/`kitchenowner`, `user`/`user`, other kitchens `kitchen123`, customers `user123`).
   **First time on a new machine:** copy `backend/src/main/resources/application-secrets.example.yml` to
   `application-secrets.yml` in the same folder and put your MySQL password there (this file is git-ignored).
   Alternatively set the `DB_USERNAME` / `DB_PASSWORD` environment variables.

2. **Frontend** (port 5173)
   Double-click `start-frontend.bat`, or:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open http://localhost:5173

**Reset the database:** stop the backend, run `DROP DATABASE homeplate;` in MySQL, start the backend again.

## Business rules implemented

- **Discovery:** GPS / area based, configurable radius (default 5 km), also limited by each kitchen's own delivery radius.
  Only `ACTIVE` kitchens with a valid trial or paid subscription (+ grace period) are shown.
- **Kitchen onboarding:** register → mobile OTP → kitchen info → address + GPS pin → ID proof + FSSAI → operations → submit.
  Status: Pending → Under Review → Approved → Active (also Docs requested / Rejected / Suspended).
  Activation starts the free trial (default 30 days).
- **Daily menu orders:** one kitchen per cart, stock decremented, max-orders-per-day limit, coupons, free delivery threshold.
  Lifecycle: Placed → Accepted → Preparing → Ready → Out for delivery → Delivered (or Rejected / Cancelled with refund status).
- **Custom food requests:** sent to eligible kitchens nearby (veg-only kitchens skip non-veg requests).
  Kitchens accept & quote or reject → customer compares offers → selects one → pays → confirmed → normal order lifecycle.
  **11:00 AM cutoff** for same-day lunch (dinner/snacks cutoff 4 PM, breakfast needs the previous day) — enforced on the server.
- **Cooking videos:** kitchens upload daily videos; admin reviews with a hygiene checklist (Approve / Reject / Resubmission required).
  Shown on the customer-facing **Kitchen Trust Profile** together with documents, ratings, complaints and inspections —
  presented as supporting evidence, not a safety guarantee.
- **Revenue (hybrid model):** subscription plans + configurable commission % on food total + small platform fee.
  Kitchen earning = food total − commission + delivery charge (self-delivery). Coupons are platform-funded.
- **Daily menu verification:** the kitchen publishes today's menu, the admin verifies it; until then the kitchen can't take
  daily-menu orders (toggle in Admin -> Settings). Editing a dish sends the menu back for verification.
- **Offers & coupons:** live offers shown to customers; the best eligible offer is applied automatically in the cart.
- **Meal subscriptions:** kitchens publish weekly / monthly meal plans; customers subscribe, pause (days are added back)
  or cancel; kitchens get a "today's deliveries" list.
- **Live delivery tracking:** the kitchen shares the delivery phone's GPS while the order is out for delivery; the customer
  sees the moving rider, distance and ETA on a map.
- **Notifications:** in-app bell for order confirmations / status updates, offers, menu verification, subscriptions.
- **Admin:** dashboards, kitchen & document verification, daily menus, video reviews, orders, custom requests,
  kitchen subscriptions, customer meal plans, revenue, offers, CSV reports, complaints, platform settings.

## Integration points (ready for later)

- **SMS OTP (live):** Twilio Verify. `application-secrets.yml` holds `homeplate.twilio.account-sid`, either
  `api-key-sid`/`api-key-secret` or `auth-token`, and `verify-service-sid` (Verify service "HomePlate").
  Twilio **trial** accounts only deliver to verified testers - add numbers in Twilio Console, or upgrade the account.
- **Order SMS notifications:** need a Twilio phone number in `homeplate.twilio.from-number`; until then they are only logged.
- **Email OTP + emails:** set `homeplate.mail.from` + `homeplate.mail.sendgrid-api-key` (Twilio SendGrid), or SMTP via
  `spring.mail.*` (e.g. Gmail + App Password). Once configured, email verification becomes mandatory at sign-up.
- **Test numbers (on by default):** any mobile `9000000002`-`9000000999` registers with OTP `123456`, no SMS sent -
  works for customers and kitchen partners (one account per number). Change with `homeplate.otp.test-numbers`
  (or env `OTP_TEST_NUMBERS`). **Production: set `OTP_TEST_NUMBERS=` (empty).**
- **Ports:** backend `SERVER_PORT` (default 8090); dev frontend proxy follows `BACKEND_PORT` (default 8090).
- **Configuration:** every secret can also be set as an environment variable (`DB_PASSWORD`, `JWT_SECRET`, `TWILIO_*`, `OTP_TEST_NUMBERS`, ...).
- **Dev mode:** `DEV_OTP=true` shows the OTP on screen for channels without a provider (never in production).
- **Payments:** `OrderService.pay` / `SubscriptionService.subscribe` are mock gateways (test mode). Replace with Razorpay
  checkout + signature verification.
- **File storage:** `FileStorageService` saves to `backend/uploads/`. Swap for S3 / cloud storage.
- **Maps:** OpenStreetMap via Leaflet (no key). Can be switched to Google Maps / Mapbox in `components/Maps.tsx`.

## Project structure

```
backend/src/main/java/com/homeplate/
  config/       DataSeeder, exception handling, static uploads
  security/     JWT filter, security rules per portal
  entity/       JPA entities (User, Kitchen, MenuItem, FoodOrder, CustomRequest, Quotation, CookingVideo, …)
  repository/   Spring Data repositories
  service/      Business logic (orders, custom requests, discovery, subscriptions, stats, OTP, notifications)
  controller/   REST APIs: /api/auth, /api/public, /api/customer, /api/kitchen, /api/admin, /api/files
frontend/src/
  api/ context/ components/ layouts/ types/ utils/
  pages/customer  pages/kitchen  pages/admin  pages/auth
```

## Before going live

- Change the JWT secret (`JWT_SECRET` env var) and the database password; never commit real secrets.
- Change the `owner` password, upgrade Twilio from trial, configure email, connect a real payment gateway.
- Food-safety: keep FSSAI verification and periodic inspections as part of the process.
