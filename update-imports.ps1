# Update imports in specific files
$filesToUpdate = @(
    "src\app\resources\page.tsx",
    "src\app\results\page.tsx",
    "src\app\pricing\page.tsx",
    "src\app\integrations\page.tsx",
    "src\app\demo\page.tsx",
    "src\app\coming-soon\page.tsx",
    "src\app\api-docs\page.tsx"
)

foreach ($file in $filesToUpdate) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $newContent = $content -replace "@/app/\(landing\)/components/", "@/app/landing/components/"
        Set-Content -Path $file -Value $newContent -NoNewline
        Write-Host "Updated imports in $file"
    } else {
        Write-Host "File not found: $file"
    }
}

# Clean up the old landing directory if it's empty
if (Test-Path "src\app\(landing)") {
    try {
        Remove-Item -Path "src\app\(landing)" -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed old (landing) directory"
    } catch {
        Write-Host "Could not remove (landing) directory: $_"
    }
}
