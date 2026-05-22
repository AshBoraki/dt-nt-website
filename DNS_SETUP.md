# DNS setup for dt-nt.com

GitHub Pages is configured for the custom domain `dt-nt.com`.

Set these records in Porkbun DNS:

| Host | Type | Answer |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `www` | CNAME | `AshBoraki.github.io` |

Remove the current Porkbun parking records:

| Host | Type | Answer |
| --- | --- | --- |
| `@` | A | `44.230.85.241` |
| `@` | A | `52.33.207.7` |
| `www` | CNAME | `uixie.porkbun.com` |

After DNS resolves to GitHub Pages, enable HTTPS enforcement in the GitHub Pages settings.

## Email DNS

`dt-nt.com` is also configured for Google Workspace mail. Keep the support address aligned with `EMAIL_SYSTEM.md`.

Observed mail records on 2026-05-18:

| Host | Type | Answer |
| --- | --- | --- |
| `@` | MX | Google Workspace MX records including `smtp.google.com`, `aspmx.l.google.com`, and Google alternates |
| `@` | TXT | `v=spf1 include:_spf.google.com include:spf.brevo.com mx ~all` |

Receiving mail for `support@dt-nt.com` works through Google Workspace aliasing to `ash@denalitechs.com`.

## Brevo Sending DNS

Brevo domain authentication for `dt-nt.com` was completed on 2026-05-21. Keep these Porkbun DNS records so automated DTNT activation email can send as `DTNT <support@dt-nt.com>`.

| Host | Type | Answer |
| --- | --- | --- |
| `brevo1._domainkey` | CNAME | `b1.dt-nt-com.dkim.brevo.com` |
| `brevo2._domainkey` | CNAME | `b2.dt-nt-com.dkim.brevo.com` |
| `@` | TXT | `brevo-code:263053223faec9274ed73f4e387eb72e` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

The existing root SPF TXT record was updated instead of creating a second SPF record:

```text
v=spf1 include:_spf.google.com include:spf.brevo.com mx ~all
```

Inbound Gmail being active is not the same thing as outbound-domain hardening.
