$content = Get-Content "src/components/admin/employees-client.tsx" -Raw
# Remove company select dropdown roughly
$content = $content -replace '(?s)<Label>Company</Label>.*?</div>\s*</div>', ''
$content = $content -replace "companyId:\s*companies\[0\]\?\.id\s*\?\?\s*\"\"", "companyId: \"\""
$content = $content -replace "companies[^,]*,\s*", ""
Set-Content "src/components/admin/employees-client.tsx" $content
Write-Host "done"
