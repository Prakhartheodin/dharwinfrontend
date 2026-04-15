# API Cost & Financial Documentation

## Project: DHARWIN (UAT frontend + backend)

**Generated:** 2026-04-15  
**Last reviewed:** 2026-04-15 (OpenAI list prices; Bolna **Add Funds** UI; **AWS S3** list rates vs amazon.com/s3/pricing; **Microsoft Graph / Gmail / YouTube** costing; **RapidAPI** external jobs — §9)  
**Scope:** `uat.dharwin.frontend`, `uat.dharwin.backend` (dependencies + `src/config/config.js` + representative services)  
**Currency:** USD list prices with **approximate INR** using **₹86 = $1** (rounded; use live FX for finance). Bolna’s own UI may show slightly different ₹ figures (different FX).  
**India note:** Cloud invoices from US entities often attract **~18% GST** on top of USD-equivalent charges — model separately in your books.

**Pricing sources:** [OpenAI platform pricing](https://platform.openai.com/docs/pricing), [OpenAI image generation / DALL·E](https://platform.openai.com/docs/guides/image-generation), [Bolna pricing](https://www.bolna.ai/pricing), [LiveKit Cloud pricing](https://livekit.io/pricing), [AWS S3 pricing](https://aws.amazon.com/s3/pricing/) + [AWS Pricing Calculator](https://calculator.aws/), [MongoDB Atlas pricing](https://www.mongodb.com/pricing), [Microsoft Graph throttling](https://learn.microsoft.com/en-us/graph/throttling), [Google Gmail API usage limits](https://developers.google.com/gmail/api/reference/quota), [YouTube Data API quota](https://developers.google.com/youtube/v3/getting-started#quota), [RapidAPI Hub](https://rapidapi.com/hub) (per-listing pricing for **Active Jobs DB** / **LinkedIn Jobs API** subscriptions); **Bolna prepaid packs** below mirror the **Add Funds** modal (Job Application Verification Agent) — confirm in dashboard before purchasing. **MongoDB §4** tables mirror the **Atlas Free / Flex / Dedicated** comparison on MongoDB’s pricing page — confirm before purchasing. **§2 S3** list rates cross-checked against AWS pricing page (2026-04-15 doc pass).

---

## API inventory summary

| # | Service | Category | Where used (repo) | Billing driver |
|---|---------|----------|-------------------|----------------|
| 1 | **OpenAI** | AI / LLM + embeddings | Backend: PM assistant, training module AI, KB embeddings, token utils | Tokens (chat + embeddings) |
| 2 | **AWS S3** | Cloud storage | Backend: `@aws-sdk/client-s3`, uploads / presigns | GB-month + requests + egress |
| 3 | **LiveKit** | Realtime A/V + recording storage target | Backend `livekit.service.js`, `s3.js`, `config.livekit` (incl. **`MINIO_*`** for local Docker recordings); frontend `livekit-client`, `@livekit/components-react`; compose under `uat.dharwin.backend/livekit/` | Cloud minutes / bandwidth, or self-host; **local** recordings → MinIO (your disk/CPU, no MinIO SaaS); **prod** → AWS S3 |
| 4 | **MongoDB Atlas** (typical) | Database | `mongoose` + `MONGODB_URL` | **Free / Flex / Dedicated** (hourly + storage; see §4) + backup / transfer |
| 5 | **SMTP / email provider** | Comms | `nodemailer` + `email.service.js` | Per message or mailbox (provider-dependent) |
| 6 | **Microsoft Graph / Outlook** | Email + identity | `@azure/msal-node`, `@microsoft/microsoft-graph-client`, `outlookProvider.js` (mail APIs; see §6) | **Microsoft 365 / Entra** licensing — not metered Graph “API units” for typical delegated mail |
| 7 | **Google OAuth + Gmail API** | Email | `googleapis`, `gmailProvider.js`, `GCP_*` OAuth | **No per-API-call meter** for normal Gmail usage; real cost is **Google Workspace** (or consumer policy) + **quota** / compliance — not “GCP compute” unless you add other Cloud SKUs |
| 8 | **YouTube Data API v3** | Media metadata | `GCP_YOUTUBE_API_KEY` or `YOUTUBE_API_KEY`; `youtubeSearch.service.js` | **Daily quota units** per GCP project (~**10k/day** default — verify); `search.list` ~**100** units/call in typical tables |
| 9 | **RapidAPI** | Job listings (marketplace) | `externalJob.service.js` — **Active Jobs DB** (`active-jobs-db.p.rapidapi.com`) & **LinkedIn Jobs API** (`linkedin-jobs-api2.p.rapidapi.com`); **`RAPIDAPI_KEY`** or **`RAPIDAPI_API_KEY`** (see `.env.example`) | **Per-API** subscription on [RapidAPI](https://rapidapi.com/hub) (Basic / Pro / Ultra + request caps — **each listing has its own price**) |
| 10 | **Bolna** | Voice AI / telephony + optional KB sync | Outbound calls: `BOLNA_*` in `config.js`; optional mirror to Bolna KB: `KB_BOLNA_SYNC_ENABLED` + `KB_BOLNA_*` | **Prepaid minutes** (wallet / Add Funds); telephony may be extra depending on product |
| 11 | **Firebase** (client) | Auth (+ Firestore init) | `shared/firebase/firebaseapi.tsx`; **Auth** used on home Firebase tab; **Firestore `db`** exported but **not referenced** elsewhere in TS/TSX | Spark vs **Blaze** if you add real Firestore usage |
| 12 | **Socket.IO** | Realtime | Frontend `socket.io-client`, backend `socket.io` | No vendor API fee (your servers + bandwidth) |
| 13 | **geoip-lite** | Geo IP (offline DB) | Backend | No per-query cloud fee (DB file / updates) |
| 14 | **Next.js app → own API** | App traffic | Axios `NEXT_PUBLIC_API_URL` | Your hosting (Vercel/VM/etc.), not a third-party API SKU |

**Also in config (no third-party SKU in this repo):** **`HRM_WEBRTC_*`** — JWT + signaling URL for an **HRM** deployment you run or integrate; cost is whatever that signaling/media stack bills, not an env line item here.

---

## Per-API cost recheck (engineering)

| # | API | Rechecked | Notes |
|---|-----|-----------|--------|
| 1 | OpenAI | Yes | **Standard** chat/embedding rates on [pricing](https://platform.openai.com/docs/pricing) still show **gpt-4o** $2.50 / $1.25 / $10 per 1M (in / cached / out), **gpt-4o-mini** $0.15 / $0.075 / $0.60, **text-embedding-3-small** $0.02/1M. Repo also uses **DALL·E 3** `1792×1024` standard (`imageSearch.service.js`) — bill **per image**, not tokens; see [image generation](https://platform.openai.com/docs/guides/image-generation). |
| 2 | AWS S3 | Yes | **Standard** storage **~$0.023/GB-mo** (first 50 TB/mo, typical **us-east-1**); tiered down at higher TB; **requests** + **egress** per [S3 pricing](https://aws.amazon.com/s3/pricing/) — use **Cost Explorer** / **Pricing Calculator**. |
| 3 | LiveKit | Partial | **Cloud:** **Build** $0, **Ship** $50/mo, **Scale** $500/mo, **Enterprise** custom — see §3 **AI agents**, **Inference**, **Observability**, **Telephony**, **Participants** tables; plus **usage/overages**. **Self-host:** your infra. Recordings → **S3** or local **MinIO**. |
| 4 | MongoDB | Partial | **Free** $0, **Flex** ~hourly + **~$30/mo** cap in UI, **Dedicated** from **~$56.94/mo** entry (see §4 tables); add backup/egress in Atlas. |
| 5 | SMTP | Partial | Provider-specific ($0–SES-pennies to $50+ flat). |
| 6 | Microsoft Graph / Outlook | Yes (code review) | **No Graph “per request” retail bill** for delegated mail in this repo; cost = **Microsoft 365 / Entra** licenses. Throttling (429) is ops risk, not a line item. Surfaces: `outlookProvider.js` (mail only). |
| 7 | Google Gmail / OAuth | Yes (code review) | **Gmail API** not metered like OpenAI; limits = **quota + Workspace subscription**. `GCP_*` = OAuth client in **Google Cloud Console** naming — not BigQuery/GKE by default. |
| 8 | YouTube Data API v3 | Yes (code review) | **Daily quota units** per Cloud project (default commonly **10,000 units/day** — verify in Console). This repo: `youtubeSearch.service.js` — **search.list** is expensive in units (~**100**/call) + **videos.list** (~**1**/batch). Over quota → **errors**, not automatic $/GB billing unless you negotiate extended quota. |
| 9 | RapidAPI | Partial | **Not** one global price — subscribe to each **API listing** on RapidAPI Hub; one key can power multiple subscriptions. Repo: `externalJob.service.js` + two hosts (see §9). |
| 10 | Bolna | Yes (UI) | Prepaid **Add Funds** tiers in **§10** (dashboard screenshot, 2026-04-15 doc pass); excludes any separate telco surcharges—validate on invoice. |
| 11 | Firebase | Partial | Current app usage is **light** (Auth demo path); Blaze cost only if you ship real Firestore/Auth scale. |
| 12–14 | Socket.IO / geoip / Next | Yes | **$0** vendor API for 12–13; 14 is your hosting. |

---

## Detailed cost breakdown

### 1. OpenAI

**Category:** AI / LLM + embeddings  
**Official pricing:** [OpenAI API pricing (platform docs)](https://platform.openai.com/docs/pricing)

**Models used in this codebase (Standard tier, per 1M tokens — [OpenAI pricing](https://platform.openai.com/docs/pricing)):**

| Model | Input | Cached input | Output | Typical use here |
|-------|-------|----------------|--------|-------------------|
| **gpt-4o-mini** | $0.15 | $0.075 | $0.60 | Training module AI (`moduleOpenAI.service.js`), default PM flows (`pmOpenAI.service.js` → `PM_OPENAI_MODEL`) |
| **gpt-4o** | $2.50 | $1.25 | $10.00 | PM escalation (`PM_OPENAI_MODEL_ESCALATION`) |
| **text-embedding-3-small** | $0.02 | — | — | `embedding.util.js` / KB pipeline |
| **dall-e-3** (images) | — | — | **Per image** (not per 1M tokens) | Course cover generation `1792×1024` **standard** in `imageSearch.service.js` — see [image generation pricing](https://platform.openai.com/docs/guides/image-generation) (e.g. **$0.08/image** for `1792×1024` standard at time of review; HD/size tiers differ) |

**Free tier:** New accounts may receive small promotional credits; **no durable free production tier** — budget from day one.

**Worked example — PM assistant + module generation (illustrative)**  
Assume in one month:

- **gpt-4o-mini:** 200 PM calls × (2k input + 800 output tokens) ≈ 400k in + 160k out → **$0.06 + $0.10 ≈ $0.16** (~₹14)  
- **gpt-4o (escalation):** 20 calls × (4k in + 2k out) → **$0.01 + $0.02 ≈ $0.03** (~₹3)  
- **Module AI large JSON:** 50 generations × (25k in + 15k out) on mini → **$0.19 + $0.54 ≈ $0.73** (~₹63)  
- **Embeddings:** 2M tokens small → **$0.04** (~₹3)

**Subtotal OpenAI (example month): ~$0.96 (~₹83)** — real bills scale with KB size, user count, and PM adoption.

**Cost tips**

- Keep **escalation on 4o** rare; tune prompts on **4o-mini** first.  
- Use **cached inputs** where prompts repeat (system + RAG prefix).  
- Batch embed texts where possible; clip inputs (`embedding.util.js` already clips).

---

### 2. AWS S3

**Category:** Cloud storage  
**Official pricing:** [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/) · estimate stacks in [AWS Pricing Calculator](https://calculator.aws/).

Rates below are **list prices** for **S3 Standard** general-purpose buckets in **US East (N. Virginia)** as commonly quoted on AWS’s page (first **50 TB / month** storage tier). **Other regions**, **S3 Express One Zone**, **S3 Tables / S3 Files / S3 Vectors**, and **Intelligent-Tiering** have **different** tables — confirm before locking budgets.

#### Storage (S3 Standard — general purpose, first tiers)

| Monthly stored (tier) | USD / GB-month (typical US East) |
|-------------------------|-----------------------------------|
| First **50 TB** | **~$0.023** |
| Next **450 TB** | **~$0.022** |
| Over **500 TB** | **~$0.021** |

#### Requests (S3 Standard — same region; order-of-magnitude)

AWS bills **per 1,000 requests**; exact cells vary by operation and region on the [pricing page](https://aws.amazon.com/s3/pricing/) under **Requests & data retrievals**.

| Request type (examples) | Typical published rate (US East, verify live) |
|-------------------------|-----------------------------------------------|
| **PUT, COPY, POST, LIST** | on the order of **$0.005 / 1,000** requests |
| **GET, SELECT**, and other GET-class | on the order of **$0.0004 / 1,000** requests |

**DELETE** requests are **$0**.

#### Data transfer & egress

- **Data transfer OUT** from S3 **to the public internet** is priced in **tiered $/GB** (first TB/month often **~$0.09/GB** in many US/EU public examples on AWS’s site — **use the region-specific table**; inter-AZ, CloudFront, and cross-region paths differ).  
- **Data transfer IN** to S3 from the internet is **not** charged the same way as egress (see AWS “Data transfer” section).

**India:** AWS India billing often adds **~18% GST** (per your contract); use **Cost Explorer** + **Tax Settings**.

**Worked example (illustrative, US East list rates):** 200 GB stored (first tier) + 50 GB internet egress at **~$0.023** and **~$0.09/GB** respectively → **200×0.023 + 50×0.09 ≈ $4.6 + $4.5 ≈ $9.1/mo** (~₹783) before tax — add **requests** if you do millions of LIST/GET.

**Cost tips**

- Lifecycle rules → **IA / Glacier** for cold files (watch **minimum duration** and **retrieval** charges).  
- **CloudFront** in front of public reads to reduce origin egress where applicable.  
- **S3 Tables / Files / Vectors** are **separate** product lines on the same pricing page — only pay if you adopt those features.

---

### 3. LiveKit (includes local MinIO for recordings)

**Category:** Realtime audio/video  
**Docs:** [LiveKit Cloud pricing](https://livekit.io/pricing) / [Cloud billing](https://docs.livekit.io/cloud/pricing/).

**Modes in this repo**

- **Self-host / dev:** `LIVEKIT_URL` default `ws://localhost:7880` — you pay **CPU/bandwidth**, not LiveKit Cloud.  
- **LiveKit Cloud:** paid tiers below (from LiveKit **pricing / product UI**); **usage** (participant minutes, bandwidth, inference, telephony beyond included allowances) is billed per [Cloud billing](https://docs.livekit.io/cloud/pricing/) — reconcile in the LiveKit dashboard.

**LiveKit Cloud plan tiers (snapshot from pricing UI — confirm on [livekit.io/pricing](https://livekit.io/pricing))**

| Plan | List price (USD) | Summary |
|------|------------------|---------|
| **Build** | **$0/mo** (no credit card) | Everything you need to **start** a project. |
| **Ship** | **$50/mo** | **Ship** the project to real users. |
| **Scale** | **$500/mo** | **Scale** apps and global reach. |
| **Enterprise** | **Custom** (contact sales) | White-glove / volume deals. |

**Build ($0/mo)** includes: agent deployment; agent observability; inference credits; global edge network; telephony (**1 free number**); session metrics and analytics; community support.

**Ship ($50/mo)** — everything in **Build**, plus: team collaboration; **instant rollback** to a previous agent deployment; email support.

**Scale ($500/mo)** — everything in **Ship**, plus: **role-based access**; **metrics export APIs**; **region pinning**; **security reports / HIPAA**; **inference discounts**.

**Enterprise (custom)** — everything in **Scale**, plus: **volume pricing** (including inference); **shared Slack** channel; **SSO**; **support SLA**.

Approximate INR for headline monthly fees (@₹86/$1): **Ship** ~**₹4,300/mo**; **Scale** ~**₹43,000/mo**.

The tables below are a **snapshot from LiveKit’s pricing UI** (same four columns: **Build → Ship → Scale → Enterprise**). Overage rates drive variable spend — confirm current numbers on [livekit.io/pricing](https://livekit.io/pricing).

#### AI voice & video agents

*Time, concurrency, and agent limits on LiveKit Cloud.*

| Feature | Build ($0) | Ship ($50) | Scale ($500) | Enterprise |
|---------|----------|------------|--------------|------------|
| **Agent session minutes** (time in-session per agent) | **1,000** included | **5,000** included, then **$0.01/min** | **50,000** included, then **$0.01/min** | Custom |
| **Concurrent agent sessions** (across all agents) | **5** | **20** | **Up to 600** (starts at **50**; request more in dashboard) | Custom |
| **Agent deployments** (deployed agents) | **1** | **2** | **4** | Custom |
| **Deployment metrics** (resources, latency, errors, …) | ✓ | ✓ | ✓ | ✓ |
| **Cold start prevention** (keep agents warm) | — | ✓ | ✓ | ✓ |
| **Instant rollback** | — | ✓ | ✓ | ✓ |
| **Background noise suppression** (STT / VAD) | ✓ | ✓ | ✓ | ✓ |
| **Voice isolation** (competing voices) | **100** min included | **1,000** included, then **$0.0012/min** | **10,000** included, then **$0.0012/min** | Custom |
| **Conversational intelligence** (e.g. end-of-turn) | ✓ | ✓ | ✓ | ✓ |

#### LiveKit Inference

*LLM, STT, TTS behind one API key.*

| Feature | Build | Ship | Scale | Enterprise |
|---------|-------|------|-------|------------|
| **Inference credits** | **$2.50** (~50 min equiv.) | **$5** (~100 min, then billed at model list prices) | **$50** (~1,000 min, then **discounted** model prices) | Custom |
| **Inference concurrency** (parallel inference sessions) | **5** | **20** (request more in dashboard) | **50** (request more) | Custom |

#### Agent observability

| Feature | Build | Ship | Scale | Enterprise |
|---------|-------|------|-------|------------|
| **Agent session recordings** (download / playback audio) | **1,000** min included | **5,000** included, then **$0.005/min** | **50,000** included, then **$0.005/min** | Custom |
| **Observability events** (transcripts, trace spans, logs) | **100,000** entries | **500,000** included, then **$0.00003/entry** | **5,000,000** included, then **$0.00003/entry** | Custom |
| **Export to cloud storage** | — | Coming soon | Coming soon | Coming soon |

#### Telephony (US + SIP)

*Phone calls and SIP — check LiveKit for non-US rates.*

| Feature | Build | Ship | Scale | Enterprise |
|---------|-------|------|-------|------------|
| **US local phone numbers** (monthly rental) | **1 free** | **1 free**, then **$1.00/mo** per extra number | Same pattern | Custom |
| **US local inbound minutes** | **50** included | **100** included, then **$0.01/min** | **1,000** included, then **$0.01/min** | Custom |
| **US toll-free numbers** (monthly rental) | — | **$2.00/mo** per number | **$2.00/mo** per number | Custom |
| **US toll-free inbound minutes** | — | **$0.02/min** | **$0.02/min** | Custom |
| **Third-party SIP minutes** (inbound/outbound via SIP trunk) | **1,000** included | **5,000** included, then **$0.004/min** | **50,000** included, then **$0.003/min** | Custom |
| **Custom SIP domains** (own domain for inbound SIP) | — | — | — | ✓ |

#### Participants (WebRTC) & media transport

*End users in realtime sessions.*

| Feature | Build | Ship | Scale | Enterprise |
|---------|-------|------|-------|------------|
| **WebRTC minutes** (end user connected via WebRTC) | **5,000** included | **150,000** included, then **$0.0005/min** | **1.5M** included, then **$0.0004/min** | Custom |
| **Concurrent connections** (users + agents) | **100** | **1,000** | **5,000** | Custom |
| **Realtime network uptime** | 99.99% | 99.99% | 99.99% | 99.99% |
| **Enhanced noise cancellation** (Krisp) | Included | Included | Included | Included |
| **Downstream data transfer** (egress to participants) | **50 GB** included | **250 GB** included, then **$0.12/GB** | **3 TB** included, then **$0.10/GB** | Custom |

**Stream import** (ingest other encodings → realtime stream): pricing exists on LiveKit’s site; details were collapsed in the source UI — open the **Stream import** row on [livekit.io/pricing](https://livekit.io/pricing).

**Where MinIO appears (local only, not a separate paid API)**  
Egress recording storage is wired in `uat.dharwin.backend/src/services/livekit.service.js` (MinIO vs AWS S3 by environment) and presigned playback in `src/config/s3.js`. Settings live under **`config.livekit.minio`** from env **`MINIO_*`** in `src/config/config.js`. The local stack is started via **`uat.dharwin.backend/docker-compose.livekit-local.yml`** / **`livekit/docker-compose.yml`** (MinIO service on ports 9000/9001). **UAT/production-style** deployments that send recordings to **AWS S3** do not need a running MinIO container; those vars can stay unused.

**Cost tips**

- Recordings to **S3** (`LIVEKIT_S3_BUCKET`) add S3 + egress costs.  
- For heavy usage, compare **self-host on a VM** vs Cloud **Scale** tier.  
- **Local MinIO:** no per-GB vendor bill — only the machine or Docker host you already run.

---

### 4. MongoDB Atlas (typical for `MONGODB_URL`)

**Category:** Database  
**Reference:** [MongoDB Atlas pricing](https://www.mongodb.com/pricing) — compare plans in-product (“See feature breakdown”).

The summaries below mirror **MongoDB Atlas** marketing/pricing UI (**Free**, **Flex**, **Dedicated**). **Hourly rates**, **caps**, and **“starts at”** figures change by region and promo — **confirm in Atlas** before budgeting.

#### Atlas plan overview (snapshot)

| Plan | Price (as shown) | Best for | Storage (headline) | RAM | vCPU |
|------|------------------|----------|--------------------|-----|------|
| **Free** | **$0/hour** (free forever) | Learning / exploring Atlas in the cloud | **512 MB** | Shared | Shared |
| **Flex** | **$0.011/hour** (up to **~$30/month** cap in UI) | Dev & testing; cost scales with usage | **Up to 5 GB** | Shared | Shared |
| **Dedicated** (recommended for prod) | **$0.08/hour** (UI: **starts at ~$56.94/month** for entry config) | Production, heavier workloads | **10 GB** (entry); scales per cluster | **2 GB** (entry); scales per cluster | **2** (entry); scales per cluster |

Approximate INR (@₹86/$1): **Dedicated** entry ~**₹4,900/mo** at the listed **$56.94** anchor; **Flex** monthly cap in UI ~**₹2,580** at **$30**.

#### Database specifications (plan comparison)

| Feature | Free | Flex | Dedicated |
|---------|------|------|-------------|
| **Storage** | 512 MB | Up to **5 GB** | Scale up to **4 TB** per node |
| **RAM** | Shared | Shared | Scale up to **768 GB** per node |
| **vCPU** | Shared | Shared | Scale up to **96 vCPUs** per node |
| **Automated failover between nodes** | Yes | Yes | Yes |
| **Cloud providers** | AWS, GCP, Azure | AWS, GCP, Azure | AWS, GCP, Azure |
| **Uptime SLA** | None | None | **99.995%** |

#### Deployments & operations

| Feature | Free | Flex | Dedicated |
|---------|------|------|-------------|
| **Automated, no-downtime version upgrades** | Yes | Yes | Auto-upgrades **configurable** |
| **Compute and storage auto-scaling** | No | No | **Yes** |
| **Multi-cloud & multi-region capable** | No | No | **Yes** |
| **Workload isolation** (read-only / analytics / search nodes, etc.) | No | No | **Yes** |

**Security** and further plan limits appear under **“See feature breakdown”** on [mongodb.com/pricing](https://www.mongodb.com/pricing); that section was collapsed in the source screenshot — expand there for auth, encryption, and compliance rows.

Treat the database as **always-on baseline cost** separate from per-token API spend; add **backup**, **data transfer**, and **support** tiers in Atlas when estimating totals.

---

### 5. SMTP (Nodemailer)

**Category:** Email transport  
**Billing:** Depends on provider (SendGrid, SES, Mailgun, Google Workspace SMTP, etc.) — often **$0–$50+ / mo** for low volume transactional, or **pennies per thousand** on SES.

**Cost tips**

- Use a dedicated transactional provider with **DMARC/SPF**; avoid overloading personal Gmail SMTP.

---

### 6. Microsoft Graph / Outlook

**Category:** Email (Microsoft 365 / Outlook) + identity  
**Docs:** [Microsoft Graph overview](https://learn.microsoft.com/en-us/graph/overview) · [Throttling](https://learn.microsoft.com/en-us/graph/throttling)

**How this repo uses it (code review)**  
`uat.dharwin.backend/src/services/emailProviders/outlookProvider.js` — OAuth via **MSAL** (`@azure/msal-node`), Graph via `@microsoft/microsoft-graph-client`. Scopes include **Mail.ReadWrite**, **Mail.Send**, **User.Read**, etc. HTTP surfaces are **mail-centric** (`/me`, `/me/messages`, folders, attachments, sendMail, reply) — **no Calendar/Drive/Teams** usage found in that provider. Routes: `src/routes/v1/outlook.route.js`, `outlook.controller.js`, `outlookClient.service.js`.

**Billing / cost model**

- **Microsoft Graph mail calls are not a separate pay-per-request SKU** for normal delegated mailbox access. What you pay for is overwhelmingly **Microsoft 365 / Exchange Online** (mailboxes) and **Entra ID (Azure AD)** as part of that ecosystem — **not** “Graph API units” like OpenAI tokens.  
- **Azure App Registration** (client id/secret) does **not** by itself imply a metered Graph invoice for the patterns in this codebase.  
- **Operational cost:** [Graph throttling](https://learn.microsoft.com/en-us/graph/throttling) (**429**) under heavy sync — engineering time and UX, not a line-item “API bill.”

**Finance-doc wording:** Budget **M365 / Entra** licenses and support — do **not** treat Graph as $0 “free API” if the org already pays substantial Microsoft fees.

---

### 7. Google APIs (Gmail + OAuth)

**Category:** Email + identity  
**Docs:** [Gmail API](https://developers.google.com/gmail/api) · [Usage limits](https://developers.google.com/gmail/api/reference/quota)

**How this repo uses it**  
`uat.dharwin.backend/src/services/emailProviders/gmailProvider.js` — **`googleapis`** (`gmail` v1, `oauth2` v2 `userinfo.get`). Same “provider” pattern as Outlook: **OAuth user tokens** + REST mail operations.

**Billing / cost model**

- **Gmail API** is generally **not billed per HTTP call** like a cloud meter. Costs sit in **Google Workspace** (business mail) or **consumer Gmail** policy — plus **per-user quotas** and **fair-use** limits documented by Google.  
- Env prefix **`GCP_*`** here means **credentials created in Google Cloud Console** (OAuth client). It does **not** automatically mean billable **GCP compute/storage** — the backend does **not** add other Google Cloud client SKUs for this path beyond **Gmail + OAuth + YouTube key** (see §8).

**Finance-doc wording:** Split **“Google Workspace subscription”** from **“incremental Gmail API spend”** (usually $0 extra for normal volumes). Enterprise compliance / Vault / DLP are **license** features, not per-call API rows.

---

### 8. YouTube Data API v3

**Category:** Media metadata  
**Docs:** [YouTube Data API — Getting started / quota](https://developers.google.com/youtube/v3/getting-started#quota) · [Quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost)

**How this repo uses it**  
`uat.dharwin.backend/src/services/youtubeSearch.service.js` calls **`search.list`** and **`videos.list`** using an API key from **`GCP_YOUTUBE_API_KEY`** or **`YOUTUBE_API_KEY`** (`config.js`). Used from training/module flows (e.g. `moduleOpenAI.service.js`, `trainingModuleAI.controller.js`).

**Billing / cost model**

- YouTube Data API v3 consumes **quota units per day** per **Google Cloud project** (default is often **10,000 units/day** — **confirm** in **Google Cloud Console → APIs & Services → Dashboard**).  
- **Unit cost (typical):** `search.list` is **expensive** (commonly **~100 units** per request in Google’s published quota tables); **`videos.list`** is typically **1 unit** per HTTP request even with several video IDs. A single successful search path in this service is therefore on the order of **~101 units** (plus retries if failures).  
- **Over daily quota:** requests **fail / are throttled** — not the same as automatic **$ per GB** overage on AWS unless you have a **commercial / extended quota** arrangement with Google.

**Cost tips**

- Cache search results; debounce module generation so you do not call **search.list** in tight loops.  
- Document **`YOUTUBE_API_KEY`** as an alias in runbooks (both env names are accepted).

---

### 9. RapidAPI (external job feeds)

**Category:** Third-party HTTP APIs (marketplace)  
**Hub:** [rapidapi.com/hub](https://rapidapi.com/hub) — **each API has its own pricing page** (Free / Basic / Pro / Ultra, monthly request caps, and overage rules differ by publisher).

**Why it was missing earlier:** the first version of this report was built from a **partial** dependency/env scan and did not trace **`RAPIDAPI_KEY`** into **`externalJob.service.js`** — that was a **documentation gap**, not evidence that RapidAPI is unused.

**How this repo uses it**  
`uat.dharwin.backend/src/services/externalJob.service.js` calls two RapidAPI hosts (see `SOURCES` in that file):

| Source key (app) | `x-rapidapi-host` | Endpoints (examples) |
|------------------|-------------------|----------------------|
| **active-jobs-db** | `active-jobs-db.p.rapidapi.com` | `/active-ats-24h`, `/active-ats-7d` |
| **linkedin-jobs-api** | `linkedin-jobs-api2.p.rapidapi.com` | `/active-jb-24h`, `/active-jb-7d` |

Auth header: **`x-rapidapi-key`** from **`RAPIDAPI_KEY`** or **`RAPIDAPI_API_KEY`** (throws **503** if unset when those routes run). Documented in **`uat.dharwin.backend/.env.example`**.

**Billing / cost model**

- RapidAPI bills **per subscribed API**, not one flat “RapidAPI SKU”. You may pay **$0** on a publisher’s free tier, **$10–50/mo** on Basic, or **hundreds** on Pro/Ultra for heavy job-ingest workloads — **open each listing** on the Hub and note **requests/month** and **overage**.  
- The same **API key** can authorize **multiple** subscriptions; total cost = **sum of active subscriptions** you attach to that key.

**Cost tips**

- Subscribe only to the **one** feed you need (Active Jobs DB *or* LinkedIn mirror) if the product allows, to avoid double monthly fees.  
- Align backend **rate limits** (this service caps users at **5 requests / minute** per `userId`) with the **plan’s hard cap** so you do not burn paid quota on abuse.  
- Log **HTTP 429** from RapidAPI and upgrade tier or cache responses.

---

### 10. Bolna (voice + optional hosted KB)

**Category:** Voice AI / telephony (+ optional knowledge-base sync to Bolna when `KB_BOLNA_SYNC_ENABLED` is on)  
**Reference:** [Bolna pricing](https://www.bolna.ai/pricing); wallet top-up in product (**Add Funds**, secured by **Stripe** per modal).

**Prepaid “Add Funds” tiers (from Bolna dashboard UI — *Job Application Verification Agent* context, same review date as header)**  
Minutes and bonuses are **as shown in-product**; the table reflects that snapshot. **Custom** top-up: **$10–$5,000**. Higher volume: **Enterprise** (book a meeting / SLAs) per modal.

| Top-up (USD) | Bonus | Minutes included (UI) | Effective ~$/min (from UI) | Approx ₹/min @₹86/$ |
|--------------|-------|------------------------|----------------------------|----------------------|
| $15 | — | *(confirm in app)* | *(tier-specific)* | — |
| $60 | — | *(confirm in app)* | *(tier-specific)* | — |
| $150 | — | **2,500** | **$0.060** | ~**₹5.16** |
| $300 | **+10%** | *(confirm in app)* | — | — |
| $600 | **+15%** | **11,500** | **~$0.052** | ~**₹4.47** |
| $1,500 | **+20%** | **30,000** | **$0.050** | ~**₹4.30** |
| $3,000 | **+33%** | **66,500** | **~$0.045** | ~**₹3.87** |

**Illustrative spend (wallet-only, using $0.045–$0.06/min band):**

- **~2,000 min/mo** ≈ **$90–$120** (~₹7,740–₹10,320) if paid at effective rates above.  
- **One $150 pack** = **2,500 min** at **$0.06/min** headline rate — enough for light verification volume until the next top-up.

**Caveats:** Voice pricing can still include **telephony / destination** components not shown in this modal; reconcile with **Bolna invoices** and your **Stripe** receipts.

---

### 11. Firebase (compat Auth + Firestore)

**Category:** BaaS  
**Billing:** Spark (free limits) vs **Blaze** (pay-as-you-go for reads/writes/storage).  
**Usage in this repo:** `firebaseapi.tsx` loads **Auth** + **Firestore**; only **Auth** is referenced from `app/page.tsx` (Firebase tab). **Firestore `db`** is initialized but **not imported** elsewhere in application TS/TSX — today you mainly pay **bundle size**, not Firestore reads, until you wire real data.  
**Cost tips:** index Firestore queries; avoid chatty listeners on large collections.

---

### 12. Socket.IO

**Category:** Realtime transport  
**Billing:** **$0** vendor API — cost is **your Node hosting + bandwidth**.

---

### 13. geoip-lite

**Category:** Geo IP lookup (offline)  
**Billing:** **$0** per lookup; occasional **DB update** effort only.

---

## AI / LLM token section (consolidated)

| Provider | Model(s) in repo | Official / primary source |
|----------|------------------|---------------------------|
| OpenAI (chat + embeddings) | `gpt-4o-mini`, `gpt-4o`, `text-embedding-3-small` | [platform.openai.com/docs/pricing](https://platform.openai.com/docs/pricing) |
| OpenAI (images) | `dall-e-3` (`1792×1024` standard) | [Image generation guide / pricing](https://platform.openai.com/docs/guides/image-generation) |

---

## Usage scenario projections (illustrative totals)

Assumptions per column are **rough** and only for order-of-magnitude planning.

| Bucket | Low (small pilot) | Medium (active SMB) | High (busy multi-tenant) |
|--------|-------------------|----------------------|---------------------------|
| OpenAI (LLM+embed) | ~$15 / mo (~₹1,290) | ~$120 / mo (~₹10,320) | ~$800 / mo (~₹68,800) |
| AWS S3 + egress | ~$10 | ~$80 | ~$500 |
| LiveKit (Cloud **Build / Ship / Scale** + usage, or self-host opex) | ~$0–50 | ~$50–350 (often **Ship** floor + usage) | ~$500–2,500+ (**Scale** floor + usage or negotiated Enterprise) |
| MongoDB Atlas | ~$0 (Free/Flex dev)–30 | ~$57–120 (Dedicated entry + small growth) | $300+ (larger Dedicated + HA / data transfer) |
| Email SMTP | ~$0–15 | ~$30 | ~$150 |
| RapidAPI (external jobs — **sum** of Active Jobs DB + LinkedIn listing subscriptions) | ~$0 (feature unused / free tiers) | ~$15–100 | ~$150–600+ (Pro/Ultra + high job-search volume) |
| Bolna voice (prepaid packs above) | ~$0–15 | ~$150–600 / mo (typical SMB verification) | ~$1,500–3,000+ (heavier + enterprise) |
| Firebase | ~$0 | ~$0–25 (mostly unused Firestore today) | ~$200+ if Blaze + real listeners |
| **Rough total** | **~$40–150** | **~$670–950** | **~$5,950–8,000+** |

Add **18% GST** on applicable imported cloud services in India where your contract says so.

---

## Cost optimization recommendations

1. **Gate AI features** behind `PM_ASSISTANT_ENABLED`, strong rate limits, and per-tenant quotas.  
2. **Log token usage** per route (PM, module AI, KB) — even coarse logs beat blind invoices.  
3. **S3:** compress uploads, resize images server-side, lifecycle old recordings.  
4. **LiveKit:** prefer simulcast off where acceptable; cap subscriber counts in product.  
5. **Audit frontend `package.json`:** drop dependencies that are never imported (smaller bundle, less supply-chain noise).  
6. **Replace illustrative prices** with **quotes from your invoices** quarterly.  
7. **RapidAPI:** cache job-list responses where safe; avoid subscribing to **two** paid feeds if one satisfies product requirements.

---

## Notes & assumptions

- OpenAI numbers taken from **OpenAI “Pricing” docs table** on 2026-04-15 (`gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small`).  
- Bolna **prepaid table** is copied from the **in-app Add Funds** modal (screenshot review, 2026-04-15); public marketing pages or **telephony** add-ons may differ — **not** a quote.  
- **MongoDB Atlas** Free/Flex/Dedicated rows in §4 follow **mongodb.com/pricing** UI (incl. **$56.94/mo** Dedicated anchor and Flex **~$30/mo** cap); region, taxes, and add-ons differ — **not** a quote.  
- **AWS S3** §2 storage/request/egress figures were checked against **aws.amazon.com/s3/pricing** on **2026-04-15**; use **Pricing Calculator** for your exact region and request mix.  
- **Microsoft Graph / Gmail / YouTube** §6–§8: billing is primarily **Microsoft 365 / Google Workspace / quota governance**, not pay-per-call retail APIs — wording avoids implying “$0 total” when orgs already pay for mail suites.  
- **RapidAPI** §9: no fixed list price in this doc — each **Hub listing** sets its own plan; add **RapidAPI invoices** to finance tracking when ATS external jobs are enabled.  
- LiveKit, SMTP, Firebase scenario figures remain **ranges** — confirm in vendor consoles.  
- This repo’s **exact** monthly cost depends on traffic, model choice, caching, and whether LiveKit/Bolna/Firebase/**RapidAPI** paths are enabled in each environment.

---

## Appendix — env keys that usually imply paid cloud APIs

From `uat.dharwin.backend/src/config/config.js` (non-exhaustive):  
`OPENAI_API_KEY`, `AWS_*`, `LIVEKIT_*`, `MINIO_*` (optional; local LiveKit recording bucket when egress is not using S3), `MONGODB_URL`, `SMTP_*`, `GCP_*`, `MICROSOFT_*`, `BOLNA_*`, `KB_BOLNA_SYNC_ENABLED`, `KB_BOLNA_*`, `GCP_YOUTUBE_API_KEY` (alias: `YOUTUBE_API_KEY`), `HRM_WEBRTC_*`.

From `uat.dharwin.backend/.env.example` (used in code but not always mirrored in `config.js`):  
`RAPIDAPI_KEY` (alias: `RAPIDAPI_API_KEY`) — **RapidAPI** external job feeds (`externalJob.service.js`).

Frontend: `NEXT_PUBLIC_API_URL`, Firebase config in `shared/firebase/firebaseapi.tsx`.
