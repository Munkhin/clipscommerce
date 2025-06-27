# Fix imports in landing page components
$landingPage = "src\app\landing\page.tsx"
if (Test-Path $landingPage) {
    $content = Get-Content $landingPage -Raw
    # Add React import if missing
    if (-not ($content -match 'import React')) {
        $content = "import React from 'react';
`n" + $content
    }
    # Update imports to use relative paths
    $content = $content -replace 'from "@/app/\(landing\)/components/', 'from "./components/'
    $content = $content -replace 'from "@/app/landing/components/', 'from "./components/'
    Set-Content -Path $landingPage -Value $content -NoNewline
    Write-Host "Updated imports in $landingPage"
}

# Install missing type definitions
Write-Host "Installing missing type definitions..."
npm install --save-dev @types/node @types/react @types/react-dom @types/next

# Fix TypeScript configuration
if (Test-Path "src\app\data_collection\tsconfig.json") {
    $tsconfig = Get-Content "src\app\data_collection\tsconfig.json" -Raw | ConvertFrom-Json
    if ($tsconfig.compilerOptions.types -notcontains "next") {
        if (-not $tsconfig.compilerOptions.types) {
            $tsconfig.compilerOptions | Add-Member -NotePropertyName "types" -NotePropertyValue @("node", "next")
        } else {
            $tsconfig.compilerOptions.types += "next"
        }
        $tsconfig | ConvertTo-Json -Depth 10 | Set-Content "src\app\data_collection\tsconfig.json"
        Write-Host "Updated data_collection tsconfig.json"
    }
}

# Fix missing module imports
$missingModules = @{
    "../../data_collection/lib/auth-token-manager.service" = "@/app/data_collection/lib/auth-token-manager.service"
    "../../workflows/deliverables/types/deliverables_types" = "@/app/workflows/deliverables/types/deliverables_types"
    "../../data_collection/lib/auth.types" = "@/app/data_collection/lib/auth.types"
}

$filesToUpdate = @(
    "src\app\api\oauth\tiktok\callback\route.ts"
)

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        foreach ($oldPath in $missingModules.Keys) {
            $newPath = $missingModules[$oldPath]
            $content = $content -replace [regex]::Escape($oldPath), $newPath
        }
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Updated imports in $file"
    }
}

Write-Host "Fixes applied. Please run 'npm run build' to verify all issues are resolved."
