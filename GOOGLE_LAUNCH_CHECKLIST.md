# DTNT Google Launch Checklist

## Website

- Primary domain: `https://dt-nt.com/`
- Sitemap: `https://dt-nt.com/sitemap.xml`
- Robots: `https://dt-nt.com/robots.txt`
- Microsoft Store install: `https://apps.microsoft.com/detail/9PFKHZ8M32HJ`

## Analytics

- GA4 measurement ID in code: `G-K5VZ64YF7Q`
- Config file: `analytics-config.js`
- Loader file: `analytics.js`
- Standard event sent: `page_view`
- DTNT event sent: `dtnt_page_view`
- Commerce events:
  - `dtnt_buy_click`
  - `dtnt_download_click`
  - `dtnt_checkout_success_view`
  - `purchase`

## Search Console

Search Console status:

- URL-prefix property verified: `https://dt-nt.com/`
- Verification file: `https://dt-nt.com/google8af56b1000558121.html`
- Sitemap submitted: `https://dt-nt.com/sitemap.xml`
- Homepage indexing requested: `https://dt-nt.com/`

Domain property can still be added later for full `dt-nt.com` coverage across all protocols and subdomains.

Submit:

```text
https://dt-nt.com/sitemap.xml
```

Preferred domain verification method:

```text
DNS TXT record at Porkbun
```

Completed fallback verification method:

```text
HTML file upload
```

Other fallback verification methods:

```text
HTML meta tag in index.html
Google Analytics verification using G-K5VZ64YF7Q
```

## Checks After Google Verification

- Confirm Google Search Console finishes processing the sitemap.
- Re-check `https://dt-nt.com/` after Google crawls it.
- Link Search Console to the GA4 property.
- Mark Microsoft Store outbound clicks as a key event if you want install-button reporting.
