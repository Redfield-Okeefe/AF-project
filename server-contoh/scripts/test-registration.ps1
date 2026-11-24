# Run from server-contoh, with backend running on loopback.
# Creates TWO fictitious candidates per run; records/audits are intentionally retained.
param([int]$Port = 3001)
$ErrorActionPreference = 'Stop'
$base = "http://127.0.0.1:$Port"
function Assert-Status($method, $path, $headers, $body, $expected) {
    $params = @{ Uri = "$base$path"; Method = $method; ErrorAction = 'Stop'; UseBasicParsing = $true }
    if ($headers) { $params.Headers = $headers }
    if ($null -ne $body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Compress -Depth 5) }
    $response = $null
    try { $response = Invoke-WebRequest @params; $status = [int]$response.StatusCode }
    catch { if (-not $_.Exception.Response) { throw }; $status = [int]$_.Exception.Response.StatusCode }
    if ($status -ne $expected) { throw "$method $path : expected $expected, actual $status" }
    Write-Host "PASS $method $path ($status)" -ForegroundColor Green
    if ($response -and $response.Content) { return ($response.Content | ConvertFrom-Json) }
}
function Login-Dummy($role) {
    $email = "$role@bnr.test"
    $secret = Read-Host "Password dummy $email" -AsSecureString
    $password = [System.Net.NetworkCredential]::new('', $secret).Password
    try {
        $result = Assert-Status 'POST' '/api/v1/auth/login' $null @{email=$email;password=$password;role=$role} 200
        if ($result.role -ne $role -or -not $result.token) { throw 'Invalid token/role' }
        return @{Authorization="Bearer $($result.token)"}
    } finally { Remove-Variable password,secret,result -ErrorAction SilentlyContinue }
}
$null = Assert-Status 'GET' '/api/v1/health' $null $null 200
$programs = Assert-Status 'GET' '/api/v1/programs' $null $null 200
$program = @($programs.items | Where-Object { $_.name -like 'DEMO - Program Pendaftaran*' -and $_.min_age_years -eq 6 -and $_.max_age_years -eq 17 })
if ($program.Count -ne 1) { throw 'Jalankan npm run seed:programs terlebih dahulu.' }
$programId = $program[0].id
$owner = Login-Dummy 'owner'
$coach = Login-Dummy 'pelatih'
$player = Login-Dummy 'pemain'
$run = [guid]::NewGuid().ToString('N').Substring(0,12)
$birth = (Get-Date).AddYears(-10).ToString('yyyy-MM-dd')
$form = @{
    full_name="Uji Fase2 A $run";gender='Laki-laki';birth_date=$birth
    birth_place='Kota Demo';school_name='Sekolah Fiktif';guardian_name='Wali Demo'
    contact_email="uji-$run@bnr.test";contact_phone='081234567890'
    address='Alamat fiktif pengujian';jersey_size='M';program_id=$programId;notes='FIKTIF - pengujian lokal'
}
$null = Assert-Status 'POST' '/api/v1/registrations' $null @{} 400
$invalid = $form.Clone(); $invalid.birth_date='2099-01-01'
$null = Assert-Status 'POST' '/api/v1/registrations' $null $invalid 400
$invalid = $form.Clone(); $invalid.program_id=[guid]::NewGuid().ToString()
$null = Assert-Status 'POST' '/api/v1/registrations' $null $invalid 400
$a = (Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
if ($a.status -ne 'menunggu') { throw 'Invalid initial registration state' }
$null = Assert-Status 'POST' '/api/v1/registrations' $null $form 409
# Same family contact, DIFFERENT player: must be accepted.
$form.full_name="Uji Fase2 B $run"
$form.gender='Perempuan'
$b = (Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$root='/api/v1/owner/registrations'
$null = Assert-Status 'GET' $root $null $null 401
$null = Assert-Status 'GET' $root $coach $null 403
$null = Assert-Status 'GET' $root $player $null 403
$null = Assert-Status 'GET' ($root+'?status=menunggu&limit=10') $owner $null 200
$detail=(Assert-Status 'GET' "$root/$($a.id)" $owner $null 200).registration
if ($detail.status -ne 'menunggu' -or -not $detail.player_id) { throw 'Missing candidate' }
$null = Assert-Status 'POST' "$root/$($a.id)/approve" $coach @{} 403
$null = Assert-Status 'POST' "$root/$($a.id)/approve" $player @{} 403
$null = Assert-Status 'POST' "$root/$($a.id)/approve" $null @{} 401
$null = Assert-Status 'POST' "$root/$($b.id)/reject" $owner @{} 400
$accepted=(Assert-Status 'POST' "$root/$($a.id)/approve" $owner @{review_note='Persetujuan pengujian'} 200).registration
if ($accepted.status -ne 'diterima' -or $accepted.account_created -ne $false) { throw 'Invalid acceptance' }
$null = Assert-Status 'POST' "$root/$($a.id)/approve" $owner @{} 409
$rejected=(Assert-Status 'POST' "$root/$($b.id)/reject" $owner @{review_note='Penolakan pengujian'} 200).registration
if ($rejected.status -ne 'ditolak') { throw 'Invalid rejection' }
$null = Assert-Status 'POST' "$root/$($b.id)/approve" $owner @{} 409
$p=(Assert-Status 'GET' "/api/v1/owner/players/$($accepted.player_id)" $owner $null 200).player
if ($p.status -ne 'aktif' -or $p.user_id -or -not $p.student_code) { throw 'Expected active player without login' }
$p=(Assert-Status 'GET' "/api/v1/owner/players/$($rejected.player_id)" $owner $null 200).player
if ($p.status -ne 'calon' -or $p.user_id) { throw 'Expected rejected candidate without login' }
$null = Assert-Status 'GET' '/api/v1/owner/players?status=aktif' $owner $null 200
$null = Assert-Status 'GET' '/media/gallery' $null $null 200
$null = Assert-Status 'GET' '/media/home' $null $null 200
$null = Assert-Status 'GET' '/api/v1/auth/me' $owner $null 200
Write-Host "Fase 2: semua pemeriksaan HTTP lulus. Data FIKTIF dipertahankan untuk verifikasi DBeaver." -ForegroundColor Green
Write-Host "Nomor pengujian: $($a.registration_number) dan $($b.registration_number)"
Remove-Variable owner,coach,player -ErrorAction SilentlyContinue
