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

Add a domain or URL-prefix property for `dt-nt.com`, then submit:

```text
https://dt-nt.com/sitemap.xml
```

Preferred verification method:

```text
DNS TXT record at Porkbun
```

Fallback verification methods:

```text
HTML file upload
HTML meta tag in index.html
Google Analytics verification using G-K5VZ64YF7Q
```

## Checks After Google Verification

- Confirm Google Search Console sees the sitemap.
- Inspect `https://dt-nt.com/`.
- Request indexing for the home page after HTTPS is trusted.
- Link Search Console to the GA4 property.
- Mark Microsoft Store outbound clicks as a key event if you want install-button reporting.
