# Strip duplicate inline page headers from strategy/tool pages.
# Pattern: a leading {/* Header */} (or just an inline icon+h1+description block)
# followed by the icon/title/desc div tree. We replace it with a minimal toolbar
# so the title comes only from the global header.

$root = "C:\Development\PayDay\payday-web"
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Files known to have an inline title block that duplicates the global page header.
$targets = @(
    "src/pages/strategies/StocksETFsStrategy.tsx",
    "src/pages/strategies/SpreadsStrategy.tsx",
    "src/pages/strategies/LEAPSStrategy.tsx",
    "src/pages/strategies/KaChingStrategy.tsx",
    "src/pages/strategies/CoveredCallsStrategy.tsx",
    "src/pages/strategies/CSPStrategy.tsx"
)

# Regex: match the entire "title block" div tree:
#   <div className="flex items-center gap-3">
#     <div className="p-3 ...">
#       <Icon ... />
#     </div>
#     <div>
#       <h1 ...>title</h1>
#       <p ...>description</p>
#     </div>
#   </div>
# We use a non-greedy match anchored on the h1 with the bg-... class pattern.
$pattern = '(?s)<div className="flex items-center gap-3">\s*<div className="p-3 [^"]+">\s*<[A-Z][A-Za-z]+ className="w-8 h-8 [^"]+"\s*/>\s*</div>\s*<div>\s*<h1 className="text-2xl font-bold[^"]*">[^<]+</h1>\s*<p className="text-sm[^"]*">[^<]+</p>\s*</div>\s*</div>'

$totalReplacements = 0
foreach ($rel in $targets) {
    $full = Join-Path $root $rel.Replace('/', '\')
    if (-not (Test-Path $full)) { continue }
    $bytes = [System.IO.File]::ReadAllBytes($full)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length - 1)]
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $before = $text
    $text = [regex]::Replace($text, $pattern, '<div className="hidden">{/* title moved to global header */}</div>')
    if ($text -ne $before) {
        # Normalize line endings
        $text = $text -replace "`r`n", "`n"
        [System.IO.File]::WriteAllText($full, $text, $utf8NoBom)
        $totalReplacements++
        Write-Output "Stripped header in $rel"
    } else {
        Write-Output "No header pattern matched in $rel"
    }
}

Write-Output "Files modified: $totalReplacements"
