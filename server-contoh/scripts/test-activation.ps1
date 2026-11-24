# Development only. Run in server-contoh with backend AND Mailpit running.
# Adds three fictional registrations; does not create accounts or send real email.
param([int]$Port=3001)
$ErrorActionPreference='Stop'
$base="http://127.0.0.1:$Port"
function Assert-Status($method,$path,$headers,$body,$expected) {
    $params=@{Uri="$base$path";Method=$method;ErrorAction='Stop';UseBasicParsing=$true}
    if($headers){$params.Headers=$headers}
    if($null -ne $body){$params.ContentType='application/json';$params.Body=($body | ConvertTo-Json -Compress -Depth 5)}
    $response=$null
    try {$response=Invoke-WebRequest @params;$status=[int]$response.StatusCode}
    catch {if(-not $_.Exception.Response){throw "Request failed: $method $path. Check backend."};$status=[int]$_.Exception.Response.StatusCode}
    if($status -ne $expected){throw "$method $path : expected $expected, actual $status"}
    Write-Host "PASS $method $path ($status)" -ForegroundColor Green
    if($response -and $response.Content){return ($response.Content | ConvertFrom-Json)}
}
function Read-Secret($prompt) {
    $secure=Read-Host $prompt -AsSecureString
    try{return [System.Net.NetworkCredential]::new('',$secure).Password}finally{$secure.Dispose()}
}
function Login-Dummy($role){
    $email="$role@bnr.test";$password=Read-Secret "Password dummy $email"
    try{
        $result=Assert-Status 'POST' '/api/v1/auth/login' $null @{email=$email;password=$password;role=$role} 200
        if($result.role -ne $role -or -not $result.token){throw 'Unexpected login result'}
        return @{Authorization="Bearer $($result.token)"}
    }finally{Remove-Variable password,result -ErrorAction SilentlyContinue}
}
$null=Assert-Status 'GET' '/api/v1/health' $null $null 200
$programs=Assert-Status 'GET' '/api/v1/programs' $null $null 200
$program=@($programs.items | Where-Object {$_.name -like 'DEMO - Program Pendaftaran*' -and $_.min_age_years -eq 6 -and $_.max_age_years -eq 17})
if($program.Count -ne 1){throw 'Run npm run seed:programs first.'}
$owner=Login-Dummy 'owner'
$coach=Login-Dummy 'pelatih'
$player=Login-Dummy 'pemain'
$run=[guid]::NewGuid().ToString('N').Substring(0,12)
$family="family-$run@bnr.test"
$form=@{full_name="Uji Fase3A A $run";gender='Laki-laki';birth_date=(Get-Date).AddYears(-10).ToString('yyyy-MM-dd');birth_place='Kota Demo';school_name='Sekolah Fiktif';guardian_name='Wali Demo';contact_email=$family;contact_phone='081234567890';address='Alamat fiktif pengujian';jersey_size='M';program_id=$program[0].id;notes='FIKTIF - pengujian lokal'}
$a=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$form.full_name="Uji Fase3A B $run";$form.gender='Perempuan'
$b=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$form.full_name="Uji Fase3A C $run"
$c=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$root='/api/v1/owner/registrations'
$null=Assert-Status 'POST' "$root/$($a.id)/approve" $owner @{} 200
$null=Assert-Status 'POST' "$root/$($b.id)/approve" $owner @{} 200
$null=Assert-Status 'POST' "$root/$($c.id)/reject" $owner @{review_note='Penolakan pengujian'} 200
$null=Assert-Status 'POST' "$root/$($a.id)/invite" $null @{} 401
$null=Assert-Status 'POST' "$root/$($a.id)/invite" $coach @{} 403
$null=Assert-Status 'POST' "$root/$($a.id)/invite" $player @{} 403
$null=Assert-Status 'POST' "$root/$($c.id)/invite" $owner @{} 409
$ia=Assert-Status 'POST' "$root/$($a.id)/invite" $owner @{} 201
$ib=Assert-Status 'POST' "$root/$($b.id)/invite" $owner @{} 201
if($ia.invitation_id -eq $ib.invitation_id -or $ia.token -or $ia.invitation_token){throw 'Invitation binding or response incorrect'}
Write-Host "Open http://127.0.0.1:8025; both invitations arrive at $family."
Write-Host "Invitation A: $($a.registration_number)"
$tokenA=Read-Secret 'Paste Kode undangan A from Mailpit'
Write-Host "Invitation B: $($b.registration_number)"
$tokenB=Read-Secret 'Paste Kode undangan B from Mailpit'
if($tokenA -eq $tokenB){throw 'Different registrations must have different tokens.'}
$emailA="login-a-$run@bnr.test"
$emailB="login-b-$run@bnr.test"
$requestA=@{purpose='activate_player';invitation_token=$tokenA;email=$emailA}
$requestB=@{purpose='activate_player';invitation_token=$tokenB;email=$emailB}
$invalid=$requestA.Clone();$invalid.invitation_token='invalid'
$null=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $invalid 400
$invalid=$requestA.Clone();$invalid.email='real@example.com'
$null=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $invalid 400
$challengeA=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $requestA 201
$null=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $requestA 429
Write-Host "Find OTP A in Mailpit at $emailA; copy within 5 minutes."
$codeA=Read-Secret 'Paste 6-digit OTP A'
if($codeA -notmatch '^\d{6}$'){throw 'OTP must have 6 digits, including leading zero.'}
$verifyA=$requestA.Clone();$verifyA.challenge_id=$challengeA.challenge_id;$verifyA.code=$codeA
$cross=$verifyA.Clone();$cross.invitation_token=$tokenB
$null=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $cross 400
$wrong=$verifyA.Clone();$wrong.code=if($codeA -eq '000000'){'000001'}else{'000000'}
$null=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $wrong 400
$proof=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $verifyA 200
if(-not $proof.verified -or -not $proof.verification_token -or $proof.account_created -ne $false){throw 'Expected verification proof only.'}
$null=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $verifyA 400
$null=Assert-Status 'GET' '/api/v1/auth/me' @{Authorization="Bearer $($proof.verification_token)"} $null 401
$challengeB=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $requestB 201
Write-Host "Find OTP B in Mailpit at $emailB."
$codeB=Read-Secret 'Paste 6-digit OTP B'
if($codeB -notmatch '^\d{6}$'){throw 'OTP must have 6 digits.'}
$verifyB=$requestB.Clone();$verifyB.challenge_id=$challengeB.challenge_id;$verifyB.code=$codeB
# Exercise all 5 wrong attempts, then ensure even the correct code is refused.
$wrongB=$verifyB.Clone();$wrongB.code=if($codeB -eq '000000'){'000001'}else{'000000'}
for($n=1;$n -le 5;$n++){$null=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $wrongB 400}
$null=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $verifyB 400
$null=Assert-Status 'POST' '/api/v1/auth/player/activate' $null @{} 501
$null=Assert-Status 'GET' '/api/v1/auth/me' $owner $null 200
$null=Assert-Status 'GET' '/media/gallery' $null $null 200
$null=Assert-Status 'GET' '/media/home' $null $null 200
Remove-Variable tokenA,tokenB,codeA,codeB,requestA,requestB,verifyA,verifyB,cross,wrong,wrongB,proof,invalid,owner,coach,player -ErrorAction SilentlyContinue
Write-Host 'Fase 3A: semua pemeriksaan HTTP di atas lulus. Tidak ada akun baru.' -ForegroundColor Green
Write-Host "Registrasi uji: $($a.registration_number), $($b.registration_number), $($c.registration_number)"
