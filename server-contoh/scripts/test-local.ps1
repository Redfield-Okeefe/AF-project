# Run from server-contoh in a SECOND PowerShell terminal, with npm start running.
# Read passwords without echo. This script performs no media upload or deletion.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3001'
function Assert-Status($method, $path, $headers, $body, $expected) {
    $params = @{ Uri = "$base$path"; Method = $method; ErrorAction = 'Stop'; UseBasicParsing = $true }
    if ($headers) { $params.Headers = $headers }
    if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Compress) }
    $response = $null
    try { $response = Invoke-WebRequest @params; $status = [int]$response.StatusCode }
    catch { if (-not $_.Exception.Response) { throw }; $status = [int]$_.Exception.Response.StatusCode }
    if ($status -ne $expected) { throw "$method $path : expected $expected, actual $status" }
    Write-Host "PASS $method $path ($status)" -ForegroundColor Green
    if ($response -and $response.Content) { return ($response.Content | ConvertFrom-Json) }
}
$null = Assert-Status 'GET' '/api/v1/health' $null $null 200
$null = Assert-Status 'GET' '/api/v1/auth/me' $null $null 401
$null = Assert-Status 'GET' '/media/gallery' $null $null 200
$null = Assert-Status 'GET' '/media/home' $null $null 200
$null = Assert-Status 'POST' '/media/gallery' $null $null 401
foreach ($role in @('owner','pelatih','pemain')) {
    $email = "$role@bnr.test"
    $secure = Read-Host "Password dummy $email" -AsSecureString
    $password = [System.Net.NetworkCredential]::new('', $secure).Password
    try {
        $login = Assert-Status 'POST' '/api/v1/auth/login' $null @{email=$email;password=$password;role=$role} 200
        if ($login.role -ne $role -or -not $login.token) { throw 'Unexpected role or missing JWT' }
        $headers = @{Authorization="Bearer $($login.token)"}
        $me = Assert-Status 'GET' '/api/v1/auth/me' $headers $null 200
        if ($me.user.email -ne $email) { throw 'Unexpected identity' }
        $null = Assert-Status 'GET' "/api/v1/auth/check/$role" $headers $null 200
        if ($role -ne 'owner') {
            $null = Assert-Status 'GET' '/api/v1/auth/check/owner' $headers $null 403
            $null = Assert-Status 'POST' '/media/gallery' $headers $null 403
            $null = Assert-Status 'POST' '/api/v1/auth/login' $null @{email=$email;password=$password;role='owner'} 403
        } else {
            # Auth passes; request has no image so no file or database modification occurs.
            $null = Assert-Status 'POST' '/media/gallery' $headers $null 400
        }
    } finally { Remove-Variable password,secure,login,headers,me -ErrorAction SilentlyContinue }
}
$null = Assert-Status 'POST' '/api/v1/auth/login' $null @{email='owner@bnr.test';password='intentionally-wrong';role='owner'} 401
Write-Host 'Semua pemeriksaan API di atas lulus.' -ForegroundColor Green
