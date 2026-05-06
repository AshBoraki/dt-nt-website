param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ResourceGroup = "dtnt-prod-rg"
$WebApp = "dtnt-fulfillment-a07d"
$TargetOrigin = "https://dt-nt.com"
$TargetSuccessUrl = "https://dt-nt.com/success/"
$TargetDownloadUrl = "https://dt-nt.com/"
$TargetStripeReturnUrl = "https://dt-nt.com/success/?session_id={CHECKOUT_SESSION_ID}"
$ExpectedARecords = @(
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153"
)

function Get-BasicAuthHeader {
    param([Parameter(Mandatory)] [string]$ApiKey)

    $bytes = [System.Text.Encoding]::ASCII.GetBytes("${ApiKey}:")
    return @{ Authorization = "Basic " + [Convert]::ToBase64String($bytes) }
}

function Invoke-Stripe {
    param(
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [string]$Uri,
        [Parameter(Mandatory)] [hashtable]$Headers,
        [hashtable]$Body
    )

    if ($Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $Body -ContentType "application/x-www-form-urlencoded"
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
}

if (-not $Force) {
    $currentARecords = @(Resolve-DnsName dt-nt.com -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress)
    $missingRecords = @($ExpectedARecords | Where-Object { $_ -notin $currentARecords })

    if ($missingRecords.Count -gt 0) {
        Write-Error "dt-nt.com is not on GitHub Pages DNS yet. Missing A records: $($missingRecords -join ', '). Use -Force only if you intentionally want to switch before DNS is ready."
    }
}

$settings = az webapp config appsettings list --resource-group $ResourceGroup --name $WebApp | ConvertFrom-Json
$secretKey = ($settings | Where-Object name -eq "STRIPE_SECRET_KEY").value
$priceId = ($settings | Where-Object name -eq "DTNT_PRICE_ID").value

if (-not $secretKey) {
    throw "Missing STRIPE_SECRET_KEY in Azure app settings."
}

if (-not $priceId) {
    throw "Missing DTNT_PRICE_ID in Azure app settings."
}

$headers = Get-BasicAuthHeader -ApiKey $secretKey
$account = Invoke-Stripe -Method Get -Uri "https://api.stripe.com/v1/account" -Headers $headers
$paymentLinks = Invoke-Stripe -Method Get -Uri "https://api.stripe.com/v1/payment_links?limit=100" -Headers $headers
$matchingLinks = @()

foreach ($link in $paymentLinks.data) {
    $lineItems = Invoke-Stripe -Method Get -Uri "https://api.stripe.com/v1/payment_links/$($link.id)/line_items?limit=20" -Headers $headers
    $usesDtntPrice = @($lineItems.data | Where-Object { $_.price.id -eq $priceId }).Count -gt 0

    if ($usesDtntPrice -and $link.active) {
        $matchingLinks += $link
    }
}

if ($matchingLinks.Count -eq 0) {
    throw "No active Stripe payment links found for DTNT price $priceId in account $($account.id)."
}

foreach ($link in $matchingLinks) {
    Invoke-Stripe -Method Post -Uri "https://api.stripe.com/v1/payment_links/$($link.id)" -Headers $headers -Body @{
        "after_completion[type]" = "redirect"
        "after_completion[redirect][url]" = $TargetStripeReturnUrl
    } | Out-Null
}

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebApp `
    --settings `
    DTNT_DOWNLOAD_URL=$TargetDownloadUrl `
    DTNT_SUCCESS_URL=$TargetSuccessUrl `
    DTNT_PUBLIC_SITE_ORIGIN=$TargetOrigin `
    -o none

[pscustomobject]@{
    stripeAccount = $account.id
    stripeBusiness = $account.settings.dashboard.display_name
    dtntPriceId = $priceId
    updatedPaymentLinks = @($matchingLinks | Select-Object -ExpandProperty id)
    stripeReturnUrl = $TargetStripeReturnUrl
    azureDownloadUrl = $TargetDownloadUrl
    azureSuccessUrl = $TargetSuccessUrl
    azureAllowedOrigin = $TargetOrigin
} | ConvertTo-Json -Depth 4
