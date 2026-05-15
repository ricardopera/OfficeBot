# rename-rebrand.ps1
# Script de rebranding: AionUi → OfficeBot
# Executar ANTES de qualquer refatoracao estrutural

param(
    [switch]$WhatIf  # Use -WhatIf para simular sem aplicar
)

$ErrorActionPreference = "Continue"

function Replace-InFile {
    param(
        [string]$File,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )
    $content = Get-Content -Path $File -Raw -Encoding UTF8
    if ($content -match $Pattern) {
        $newContent = $content -replace $Pattern, $Replacement
        if ($WhatIf) {
            Write-Host "[WHATIF] Would replace '$Pattern' → '$Replacement' in: $File" -ForegroundColor Yellow
        } else {
            Set-Content -Path $File -Value $newContent -Encoding UTF8 -NoNewline
            Write-Host "[OK] $Description : $File" -ForegroundColor Green
        }
    }
}

Write-Host "=== Rebranding AionUi → OfficeBot ===" -ForegroundColor Cyan

# 1. Renomear arquivos: aion-extension.json → officebot-extension.json
Write-Host "`n[1/6] Renomeando manifest files..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -Filter "aion-extension.json" -File | ForEach-Object {
    $newName = $_.DirectoryName + "\officebot-extension.json"
    if ($WhatIf) {
        Write-Host "[WHATIF] Would rename: $($_.FullName) → $newName" -ForegroundColor Yellow
    } else {
        Move-Item -LiteralPath $_.FullName -Destination $newName -Force
        Write-Host "[OK] Renamed manifest: $($_.Name)" -ForegroundColor Green
    }
}

# 2. Renomear classes e interfaces TypeScript/JavaScript
Write-Host "`n[2/6] Renomeando classes e interfaces..." -ForegroundColor Cyan

# AionUiDatabase → OfficeBotDatabase (classe principal do legado)
Replace-InFile -File "src/database/AionUiDatabase.ts" -Pattern "AionUiDatabase" -Replacement "OfficeBotDatabase" -Description "Classe AionUiDatabase"

# 3. Renomear cookies: aionui-session → officebot-session
Write-Host "`n[3/6] Renomeando cookies..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.Extension -in @('.ts','.js','.json') } | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    if ($content -match "aionui-session") {
        Replace-InFile -File $_.FullName -Pattern "aionui-session" -Replacement "officebot-session" -Description "Cookie session"
    }
}

# 4. Renomear env vars: AIONUI_* → OFFICEBOT_*
Write-Host "`n[4/6] Renomeando env vars..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.Extension -in @('.env','*.config.js','*.config.ts','json') } | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    if ($content -match "AIONUI_") {
        Replace-InFile -File $_.FullName -Pattern "AIONUI_" -Replacement "OFFICEBOT_" -Description "Env var prefix"
    }
}

# 5. Renomear deep links: aionui:// → officebot://
Write-Host "`n[5/6] Renomeando deep links..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.Extension -in @('.ts','.js','.json') } | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    if ($content -match "aionui://") {
        Replace-InFile -File $_.FullName -Pattern "aionui://" -Replacement "officebot://" -Description "Deep link protocol"
    }
}

# 6. Renomear npm package references (manter @office-ai/platform intacto)
Write-Host "`n[6/6] Renomeando referencias de package..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -File -Filter "package.json" | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    if ($content -match "aionui" -and $content -notmatch "@office-ai") {
        Replace-InFile -File $_.FullName -Pattern "aionui" -Replacement "officebot" -Description "npm package name"
    }
}

# 7. Branding global: AionUi/AionUI → OfficeBot em todo lugar
Write-Host "`n[7/7] Aplicando branding global (AionUi → OfficeBot)..." -ForegroundColor Cyan
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.Extension -in @('.ts','.tsx','.js','.jsx','.json') } | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    $modified = $false

    # Patter: AionUi ou AionUI (case-sensitive para replacements)
    if ($content -match "AionUi") {
        $content = $content -replace "AionUi", "OfficeBot"
        $modified = $true
    }
    if ($content -match "AionUI") {
        $content = $content -replace "AionUI", "OfficeBot"
        $modified = $true
    }
    if ($content -match "aionui") {
        $content = $content -replace "aionui", "officebot"
        $modified = $true
    }

    if ($modified) {
        if ($WhatIf) {
            Write-Host "[WHATIF] Would update branding in: $($_.FullName)" -ForegroundColor Yellow
        } else {
            Set-Content -Path $_.FullName -Value $content -Encoding UTF8 -NoNewline
            Write-Host "[OK] Branding: $($_.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`n=== Rebranding concluido ===" -ForegroundColor Cyan
if ($WhatIf) {
    Write-Host "Modo WhatIf ativo - nenhuma alteracao foi aplicada." -ForegroundColor Yellow
} else {
    Write-Host "Todas as referencias de identidade foram renomeadas." -ForegroundColor Green
}