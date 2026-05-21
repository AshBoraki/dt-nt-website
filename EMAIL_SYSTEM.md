# DTNT Email System Notes

Current truth checked on 2026-05-21.

## May 21, 2026 Audit Result

- DTNT customer activation email does not use Resend, SendGrid, Mailgun, Postmark, or Sender.
- DTNT customer activation email is sent by the DTNT fulfillment service through SMTP settings named `DTNT_FULFILLMENT_SMTP_*`.
- Deleting a Resend API key should not break DTNT activation email by itself.
- The bigger DTNT risk found on May 21, 2026 is that `https://dtnt-fulfillment-a07d.azurewebsites.net/health` returns Azure `403` with `Error 403 - This web app is stopped`.
- Because the website still has live Stripe checkout enabled and still points status checks to that fulfillment URL, paid checkout should not be considered fully safe until the fulfillment app is running again.

Separate note: PropoKit does use `RESEND_API_KEY`. If a Resend key was deleted, check PropoKit separately before relying on PropoKit outbound email.

## Public Support Address

- Customer-facing DTNT support email: `support@dt-nt.com`.
- Website, legal pages, checkout return pages, release notes, and fulfillment config should keep pointing to `support@dt-nt.com`.
- This address is an alternate email on the Google Workspace user `ash@denalitechs.com`, so inbound customer support mail lands in Ash's mailbox.

## Google Workspace Domains

- Primary Workspace domain: `denalitechs.com`.
- DTNT domain: `dt-nt.com`.
- In Google Admin, `dt-nt.com` is configured as a verified secondary domain with Gmail activated.
- Public DNS has Google MX records for `dt-nt.com`.
- Public DNS has SPF at the root:
  - `v=spf1 include:_spf.google.com ~all`

## Active Workspace Aliases Relevant To DTNT

- `support@dt-nt.com` routes to `ash@denalitechs.com`.
- `support@denalitechs.com` routes to `ash@denalitechs.com`.
- `hello@denalitechs.com` routes to `ash@denalitechs.com`.
- `services@denalitechs.com` routes to `ash@denalitechs.com`.

The old `Hello@denalitechs.com` and `services@denalitechs.com` paid users were removed after migration and converted into aliases under Ash.

## Billing / Wix State

- Google Admin currently shows one active assigned Google Workspace user: `ash@denalitechs.com`.
- Wix still showed a `3 business email users @denalitechs.com` subscription after the cleanup.
- Wix Premium Subscriptions showed auto-renew off for that email subscription.
- A reply was sent to Wix support ticket `825414190` asking Wix to reduce the business email subscription from 3 users to 1 user.

Do not recreate paid users for `hello@denalitechs.com`, `services@denalitechs.com`, or `support@dt-nt.com` unless there is a deliberate business reason. They should remain aliases to keep email cost low.

## Sending Mail

DTNT currently uses `support@dt-nt.com` as a support/reply address. Receiving mail is configured.

If DTNT later sends automated email from `@dt-nt.com`, add/check these before launch:

- Google Workspace DKIM for `dt-nt.com`
- DMARC for `_dmarc.dt-nt.com`
- Any transactional provider DKIM/return-path records if a provider is introduced

Do not assume the DTNT domain is fully hardened for outbound automation just because inbound Gmail works.
