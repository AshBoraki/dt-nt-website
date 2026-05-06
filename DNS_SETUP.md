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
