# Fix mojibake from prior color-refactor.ps1 run.
# Reverses: UTF-8 bytes were read as Win-1252, then re-encoded as UTF-8 with BOM.
# Also: strips UTF-8 BOM and normalizes line endings to LF.

$root = "C:\Development\PayDay\payday-web"
Set-Location $root
$changed = git diff --name-only HEAD | Where-Object { $_ -match '\.(tsx|ts|css|js)$' }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8 = [System.Text.Encoding]::UTF8

# Strict UTF-8 decoder that throws on invalid sequences
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)

$fixedCount = 0
$mojibakeCount = 0

foreach ($relPath in $changed) {
    $fullPath = Join-Path $root $relPath.Replace('/', '\')
    if (-not (Test-Path $fullPath)) { continue }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)

    # Strip UTF-8 BOM if present
    $hadBom = $false
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length - 1)]
        $hadBom = $true
    }

    $text = $utf8.GetString($bytes)

    # Mojibake reversal: take all chars (now decoded UTF-8 from corrupted bytes),
    # re-encode as Win-1252 single bytes, then decode those bytes as strict UTF-8.
    # If strict UTF-8 succeeds and produces different text containing high-codepoint chars,
    # the reversal was meaningful and we keep it.
    $fixedText = $text
    try {
        $reBytes = $win1252.GetBytes($text)
        $candidate = $utf8Strict.GetString($reBytes)
        # Only accept if candidate contains non-BMP / emoji chars or other valid UTF-8 sequences
        # that the corrupted version did not have. Use a heuristic: any high code point > 0x7F
        # in the candidate means we successfully decoded UTF-8 multi-byte sequences.
        $hasHighInCandidate = $false
        foreach ($ch in $candidate.ToCharArray()) {
            if ([int][char]$ch -gt 0x7F) { $hasHighInCandidate = $true; break }
        }
        if ($hasHighInCandidate -and $candidate -ne $text) {
            $fixedText = $candidate
            $mojibakeCount++
        }
    } catch {
        # Strict UTF-8 decode failed -> this file did not have mojibake, leave as-is
    }

    # Normalize line endings to LF
    $fixedText = $fixedText -replace "`r`n", "`n"
    $fixedText = $fixedText -replace "`r", "`n"

    [System.IO.File]::WriteAllText($fullPath, $fixedText, $utf8NoBom)
    $fixedCount++
}

Write-Output "Files processed: $fixedCount"
Write-Output "Files with mojibake repaired: $mojibakeCount"
