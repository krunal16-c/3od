# 3oD Marketplace Design Specification

Date: 2026-09-22  
Status: Approved product direction; Cloudflare R2 selected for MVP file storage

## 1. Product summary

3oD is an India-wide two-sided marketplace connecting people and businesses that need custom parts with independent 3D-printer owners. Buyers upload designs and requirements, receive supplier quotes, compare price and delivery time, place an order, and receive the printed part. CNC machining is a future capability that should reuse the marketplace primitives without being included in the first release.

Primary positioning:

> 3oD — India's 3D Printing Marketplace

Buyer promise:

> Upload your design. Compare quotes. Get it made.

Supplier promise:

> Turn your idle printer into income.

## 2. Product goals

- Make it easy for students, hobbyists, startups, designers, and small businesses to request custom printed parts.
- Give independent printer owners a low-friction way to discover paid work.
- Learn real pricing, lead times, quality expectations, and supplier reliability through a request-for-quote model.
- Build trust through transparent profiles, performance history, order evidence, and dispute handling.
- Support India-wide discovery while allowing fulfillment to grow cluster-by-cluster.
- Preserve a clear expansion path to CNC machining.

## 3. Non-goals for the first release

- Universal instant quoting across all printers and materials.
- Mandatory KYC-document collection by 3oD.
- CNC machining workflows.
- Public browsing of customer design files.
- Medical, aerospace, safety-critical, or certification claims.
- Fully automated inspection or quality certification.
- An internal wallet or improvised escrow service.

## 4. Marketplace model

The first release uses a request-for-quote workflow:

1. Buyer creates an RFQ and uploads a design.
2. The platform validates the file and requirements.
3. The matching system identifies suppliers by capability, material, location, availability, and reliability.
4. Suppliers submit quotes.
5. Buyer compares quotes and accepts one.
6. Payment is collected through an India-compatible payment provider.
7. Supplier prints, provides production evidence, and ships or hands over the part.
8. Buyer accepts, raises an issue, or reaches the acceptance deadline.
9. Supplier payout, review, and analytics events are processed.

The platform should avoid promising an exact price before suppliers respond. Bambu Studio output is treated as supplier-provided technical costing evidence, not as the marketplace's final commercial price.

## 5. Buyer experience

Buyer inputs:

- STL, 3MF, OBJ, and later CAD formats such as STEP for CNC.
- Quantity, material, color, finish, purpose, tolerance if known, deadline, destination, pickup preference, confidentiality requirement, and notes.

Buyer quote cards show:

- Total price in INR.
- Material and process.
- Estimated print time and delivery date.
- Shipping or pickup cost.
- Supplier rating and completed orders.
- Machine and capability summary.
- Quote expiry.
- Refund, cancellation, and dispute terms.

Primary buyer screens:

- Landing page.
- Request a quote.
- File upload and validation.
- Quote comparison.
- Checkout.
- Order tracking.
- Order messages and files.
- Reviews and disputes.
- Profile, addresses, and payment history.

## 6. Supplier experience

Supplier onboarding is self-attested and low friction. 3oD does not require KYC documents in the first release.

Supplier inputs:

- Name or business name.
- Mobile and email verification.
- City and serviceable locations.
- Printer models and build volume.
- Materials, nozzle sizes, colors, and finish options.
- Availability, minimum order value, typical turnaround, pickup, and shipping options.
- Payout setup.

Supplier responsibility terms require the supplier to confirm responsibility for accurate capabilities, pricing, delivery commitments, design rights, taxes, safety, product legality, and customer communication.

Trust labels must describe what is actually known:

- Phone verified.
- Payout enabled.
- Profile complete.
- First successful order.
- Reliable delivery history.
- Top-rated supplier.

Avoid using “verified supplier” unless the verification basis is explicit.

Supplier screens:

- Dashboard.
- New RFQs.
- Quotes.
- Active orders.
- Earnings and payout status.
- Printer, material, and availability profiles.
- Messages.
- Reviews.
- Responsibility and policy acknowledgements.

## 7. Bambu costing workflow

For Bambu Lab suppliers, the platform accepts data from Bambu Studio such as estimated filament weight, print duration, support material, plate count, machine profile, and material profile.

The supplier's final quote may combine:

```text
material cost
+ machine-hour cost
+ electricity
+ setup labor
+ post-processing
+ packaging
+ shipping
+ platform fee
+ applicable taxes
+ reprint/risk allowance
```

The first version supports manual structured entry and optional evidence upload. Automatic parsing of Bambu Studio files is deferred until sufficient real-world quote data exists.

## 8. Backend boundaries

The initial implementation should be a modular application with explicit boundaries:

- Identity and access.
- User and supplier profiles.
- Supplier capabilities.
- RFQs and files.
- Matching.
- Quotes.
- Orders and state transitions.
- Payments and payouts.
- Messaging.
- Shipping.
- Reviews.
- Disputes and refunds.
- Notifications.
- Admin and moderation.
- Analytics.
- Audit logging.

Each boundary owns its state and exposes explicit interfaces. The first deployment may run these modules together, but the design must not depend on shared mutable tables or implicit cross-module behavior.

## 9. Core entities

```text
User
BuyerProfile
SupplierProfile
SupplierVerification
Printer
Material
Capability
RFQ
RFQFile
RFQRequirement
Quote
QuoteLineItem
Order
OrderEvent
Payment
Payout
Shipment
Conversation
Message
Review
Dispute
Refund
Notification
AuditLog
```

Accepted quote terms are copied into an order snapshot so that later profile or pricing changes cannot alter historical orders.

## 10. State machines

RFQ:

```text
Draft → Submitted → File validation → Open for quotes → Quotes received
                                      ├→ Rejected
                                      └→ Quote selected / Expired / Cancelled
```

Quote:

```text
Draft → Submitted → Visible to buyer → Accepted / Rejected / Expired
```

Order:

```text
Awaiting payment → Payment received → Supplier confirmed → Preparing
→ Printing → Quality check → Ready for pickup/shipping → Dispatched
→ Delivered → Buyer acceptance window → Accepted / Issue reported / Auto-completed
```

The system must record every state transition as an immutable order event with actor, timestamp, reason, and relevant metadata.

## 11. Payments and payouts

3oD should use an India-compatible regulated payment provider with marketplace or split-payout support. The platform must not operate an informal wallet or describe its own holding mechanism as regulated escrow.

The internal financial ledger records:

- Order amount.
- Platform fee.
- Payment fee.
- Tax amount.
- Supplier payable.
- Refunds and adjustments.
- Payout status.

Payment webhooks must be signature-verified, idempotent, retried safely, and stored for reconciliation and audit.

## 12. Security and privacy

Design files are confidential business assets and an upload attack surface. Controls include:

- Allowlisted extensions and content types.
- Maximum file size, request size, and rate limits.
- Malware scanning.
- Metadata validation and safe randomized storage keys.
- Private object storage and short-lived signed URLs.
- Isolated preview generation.
- Separate file-serving origin.
- No executable uploads.
- Object-level authorization on every file, RFQ, quote, order, message, and payout.
- Role-based access control and admin MFA.
- CSRF protection where cookie authentication is used.
- Exact CORS origins and restricted methods/headers.
- Content Security Policy, secure cookies, and nosniff headers.
- Encryption in transit and at rest.
- Audit logs for sensitive actions and file access.
- Secret management outside source control.
- Backups, restore tests, dependency scanning, and security monitoring.

Suppliers and buyers should have account-level rate limits on login, uploads, RFQ creation, quote submission, messaging, and payment actions. Payment and order creation should require idempotency keys.

## 13. Supplier policies

Supplier terms state that suppliers are independent service providers, not employees or representatives of 3oD. Suppliers are responsible for applicable laws, taxes, safety, design rights, product legality, equipment, materials, and delivery promises.

Suppliers may not accept unlawful, dangerous, regulated, infringing, or prohibited orders. 3oD may remove content, cancel orders, restrict access, suspend accounts, or apply other remedies when there is credible evidence of policy violation or repeated service failure.

Policy set:

- Buyer terms.
- Supplier agreement.
- Design ownership and IP policy.
- Confidential-file policy.
- Prohibited items policy.
- Quality and reprint policy.
- Cancellation and refund policy.
- Shipping and damage policy.
- Dispute-resolution policy.
- Privacy notice.
- Payout and tax responsibility policy.
- Acceptable-use and platform-safety policy.

All policies require review by Indian legal and tax professionals before launch.

## 14. Brand and marketing

Product name: **3oD**  
Descriptor: **India's 3D Printing Marketplace**

Homepage headline:

> Your design. Real quotes. Made in India.

Primary buyer CTA: **Get quotes for my design**  
Primary supplier CTA: **Earn from my 3D printer**

Supplier messaging:

- Turn your idle printer into income.
- Your printer. Your rates. Your work.
- Choose the jobs. Set the price. Make the part.
- Put your 3D printer to work.

Buyer messaging:

- Upload once. Compare real print quotes.
- From STL to shipped part.
- Find a printer for the job, not just a printer.
- Get your design made without buying a printer.

Future product naming:

- 3oD Print.
- 3oD CNC.
- 3oD Pro.
- 3oD Makers.

Trademark, domain, social-handle, and pronunciation checks are required before final brand lock.

## 15. SEO and AI-search content

Priority buyer topics:

- 3D printing service India.
- Online 3D printing quotes India.
- Upload STL and get a quote.
- Custom 3D printing service.
- Prototype 3D printing India.
- Low-volume 3D printing India.
- 3D printed parts India.

Priority supplier topics:

- Earn money with a 3D printer.
- 3D-printing jobs in India.
- Sell 3D-printing services.
- Make money from an idle 3D printer.
- How to get 3D-printing customers.

Suggested title:

> 3D Printing Services in India | Get Quotes Online | 3oD

Suggested meta description:

> Upload your 3D design and compare quotes from independent 3D-printing providers across India. Get custom parts, prototypes, replacement parts, and small batches made.

Initial content topics:

- How much does 3D printing cost in India?
- How to calculate 3D-printing cost from Bambu Studio.
- PLA vs PETG vs ABS.
- STL vs 3MF.
- How to prepare a file for 3D printing.
- How to find a reliable 3D-printing provider.
- How to earn money with an idle 3D printer.
- 3D printing versus CNC machining.

Content should lead with direct answers, use practical tables and FAQs, cite authoritative sources, show authorship and update dates, and avoid keyword stuffing.

## 16. Measurement and learning loop

North Star metric:

> Completed orders delivered on time and accepted by the buyer.

Core metrics:

- RFQ completion rate.
- Upload failure rate.
- Time to first quote.
- Quotes per RFQ.
- Quote acceptance rate.
- Supplier response rate.
- On-time completion rate.
- Reprint rate.
- Cancellation and dispute rate.
- Average order value.
- Platform contribution margin.
- Buyer repeat-order rate.
- Supplier repeat participation.

Early experiments:

1. Test whether buyers submit designs without an instant price.
2. Test whether suppliers respond within a useful time.
3. Test whether common materials receive multiple quotes.
4. Test whether buyers choose on price, time, rating, or location.
5. Measure supplier reliability before automating ranking.
6. Test whether repeat orders stay with the platform.
7. Test platform-fee acceptance and off-platform leakage.

## 17. CNC expansion

CNC will share users, suppliers, files, RFQs, quotes, orders, payments, reviews, and disputes, but use a separate process module.

CNC-specific fields include STEP, IGES, DXF, technical drawings, material grade, tolerances, surface finish, axes, milling or turning, tooling, inspection, heat treatment, and batch quantity.

The first CNC release should follow a new design cycle after the 3D-printing marketplace has enough operational data.

## 18. Selected MVP storage decision

3oD will use Cloudflare R2 for design-file storage during the MVP.

Requirements:

- Private R2 buckets only.
- S3-compatible access through a storage adapter.
- Presigned upload and download URLs.
- Separate quarantine, approved, processed, and deleted storage locations.
- Malware scanning before an uploaded file becomes available to other users.
- PostgreSQL stores file metadata, ownership, hashes, status, and object keys; file contents remain in R2.
- No public file URLs.
- Maximum file size and total RFQ upload limits enforced server-side.
- Abandoned uploads automatically deleted according to the retention policy.
- Storage-provider interfaces must allow later migration to Google Cloud Storage in Mumbai or AWS S3 without changing marketplace modules.

## 19. Open decisions before implementation

- Technology stack.
- Remaining cloud compute and deployment provider.
- Payment provider and payout schedule.
- Initial file-size and retention limits.
- Shipping integration versus supplier-managed shipping.
- Whether messaging hides contact details in the first release.
- Platform fee model.
- Pilot supplier geography and onboarding targets.
- Final brand and domain.

Implementation should begin only after the technology stack and these operational decisions are approved.
