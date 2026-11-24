# Local development only. Backend + Mailpit must be running.
# Creates three fictional accepted players; A and B create accounts.
param([int]$Port=3001)
$ErrorActionPreference='Stop'
$base="http://127.0.0.1:$Port"
function Assert-Status($method,$path,$headers,$body,$expected){
    $params=@{Uri="$base$path";Method=$method;ErrorAction='Stop';UseBasicParsing=$true}
    if($headers){$params.Headers=$headers}
    if($null -ne $body){$params.ContentType='application/json';$params.Body=($body | ConvertTo-Json -Compress -Depth 5)}
    $response=$null
    try{$response=Invoke-WebRequest @params;$status=[int]$response.StatusCode}
    catch{if(-not $_.Exception.Response){throw "Request failed: $method $path. Check backend."};$status=[int]$_.Exception.Response.StatusCode}
    if($status -ne $expected){throw "$method $path : expected $expected, actual $status"}
    Write-Host "PASS $method $path ($status)" -ForegroundColor Green
    if($response -and $response.Content){return ($response.Content | ConvertFrom-Json)}
}
function Read-Secret($prompt){
    $secure=Read-Host $prompt -AsSecureString
    try{return [System.Net.NetworkCredential]::new('',$secure).Password}finally{$secure.Dispose()}
}
function Login($email,$password,$role,$expected=200){
    return (Assert-Status 'POST' '/api/v1/auth/login' $null @{email=$email;password=$password;role=$role} $expected)
}
function New-Proof($registration,$loginEmail,$label){
    $root='/api/v1/owner/registrations'
    $null=Assert-Status 'POST' "$root/$($registration.id)/invite" $owner @{} 201
    Write-Host "Mailpit: invitation $label / $($registration.registration_number) to $family"
    $token=Read-Secret "Paste invitation $label"
    $req=@{purpose='activate_player';invitation_token=$token;email=$loginEmail}
    $challenge=Assert-Status 'POST' '/api/v1/auth/otp/request' $null $req 201
    Write-Host "Mailpit: OTP $label to $loginEmail"
    $req.challenge_id=$challenge.challenge_id;$req.code=Read-Secret "Paste OTP $label (6 digits)"
    $proof=Assert-Status 'POST' '/api/v1/auth/otp/verify' $null $req 200
    if(-not $proof.verified -or -not $proof.verification_token){throw 'Proof missing'}
    return @{invitation_token=$token;verification_token=$proof.verification_token}
}
$null=Assert-Status 'GET' '/api/v1/health' $null $null 200
$programs=Assert-Status 'GET' '/api/v1/programs' $null $null 200
$program=@($programs.items | Where-Object {$_.name -like 'DEMO - Program Pendaftaran*' -and $_.min_age_years -eq 6 -and $_.max_age_years -eq 17})
if($program.Count -ne 1){throw 'Run npm run seed:programs first.'}
$ownerLogin=Login 'owner@bnr.test' (Read-Secret 'Password dummy Owner') 'owner'
$owner=@{Authorization="Bearer $($ownerLogin.token)"}
$run=[guid]::NewGuid().ToString('N').Substring(0,12)
$family="family-3b-$run@bnr.test"
$emailA="player-a-$run@bnr.test";$emailB="player-b-$run@bnr.test"
$form=@{full_name="Uji Fase3B A $run";gender='Laki-laki';birth_date=(Get-Date).AddYears(-10).ToString('yyyy-MM-dd');birth_place='Kota Demo';school_name='Sekolah Fiktif';guardian_name='Wali Demo';contact_email=$family;contact_phone='081234567890';address='Alamat fiktif pengujian';jersey_size='M';program_id=$program[0].id;notes='FIKTIF - pengujian lokal'}
$a=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$form.full_name="Uji Fase3B B $run";$form.gender='Perempuan'
$b=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$form.full_name="Uji Fase3B C $run"
$c=(Assert-Status 'POST' '/api/v1/registrations' $null $form 201).registration
$root='/api/v1/owner/registrations'
foreach($r in @($a,$b,$c)){$null=Assert-Status 'POST' "$root/$($r.id)/approve" $owner @{} 200}
# Random development password stays in memory; never printed or saved by this script.
$password='Test!'+[guid]::NewGuid().ToString('N')
$path='/api/v1/auth/player/activate'
$null=Assert-Status 'POST' $path $null @{} 400
$proofA=New-Proof $a $emailA 'A'
$proofB=New-Proof $b $emailB 'B'
$bodyA=$proofA.Clone();$bodyA.password=$password;$bodyA.password_confirmation=$password
$bodyB=$proofB.Clone();$bodyB.password=$password;$bodyB.password_confirmation=$password
$bad=$bodyA.Clone();$bad.verification_token='invalid'
$null=Assert-Status 'POST' $path $null $bad 401
$bad=$bodyA.Clone();$bad.password='short';$bad.password_confirmation='short'
$null=Assert-Status 'POST' $path $null $bad 400
$bad=$bodyA.Clone();$bad.password_confirmation='different'
$null=Assert-Status 'POST' $path $null $bad 400
$bad=$bodyA.Clone();$bad.role='owner'
$null=Assert-Status 'POST' $path $null $bad 400
$bad=$bodyA.Clone();$bad.invitation_token=$proofB.invitation_token
$null=Assert-Status 'POST' $path $null $bad 409
$bad=$bodyA.Clone();$bad.email=$emailB
$null=Assert-Status 'POST' $path $null $bad 400
$null=Login $emailA $password 'pemain' 401
$accountA=Assert-Status 'POST' $path $null $bodyA 201
$accountB=Assert-Status 'POST' $path $null $bodyB 201
if(-not $accountA.account_created -or -not $accountB.account_created -or $accountA.user.id -eq $accountB.user.id -or $accountA.player.id -eq $accountB.player.id -or $accountA.user.role -ne 'pemain' -or $accountB.user.role -ne 'pemain' -or $accountA.user.email -ne $emailA -or $accountB.user.email -ne $emailB -or $accountA.user.password_hash -or $accountB.user.password_hash){throw 'Unexpected account binding'}
$null=Assert-Status 'POST' $path $null $bodyA 409
$null=Assert-Status 'POST' "$root/$($a.id)/invite" $owner @{} 409
$loginA=Login $emailA $password 'pemain'
$loginB=Login $emailB $password 'pemain'
if($loginA.user.id -ne $accountA.user.id -or $loginB.user.id -ne $accountB.user.id){throw 'Login identity mismatch'}
$headersA=@{Authorization="Bearer $($loginA.token)"}
$headersB=@{Authorization="Bearer $($loginB.token)"}
$meA=Assert-Status 'GET' '/api/v1/auth/me' $headersA $null 200
$meB=Assert-Status 'GET' '/api/v1/auth/me' $headersB $null 200
if($meA.user.id -ne $accountA.user.id -or $meB.user.id -ne $accountB.user.id){throw 'Me identity mismatch'}
$null=Login $emailA $password 'owner' 403
$null=Assert-Status 'GET' '/api/v1/owner/registrations' $headersA $null 403
# An email already used by the seeded player must not be reassigned.
$proofC=New-Proof $c 'pemain@bnr.test' 'C'
$bodyC=$proofC.Clone();$bodyC.password=$password;$bodyC.password_confirmation=$password
$null=Assert-Status 'POST' $path $null $bodyC 409
$detail=(Assert-Status 'GET' "$root/$($c.id)" $owner $null 200).registration
$unlinked=(Assert-Status 'GET' "/api/v1/owner/players/$($detail.player_id)" $owner $null 200).player
if($unlinked.user_id){throw 'Duplicate email unexpectedly linked'}
$null=Assert-Status 'GET' '/media/gallery' $null $null 200
$null=Assert-Status 'GET' '/media/home' $null $null 200
Write-Host 'Fase 3B: semua pemeriksaan HTTP di atas lulus.' -ForegroundColor Green
Write-Host "A/B akun fiktif dibuat: $emailA, $emailB. Password acak pengujian tidak disimpan."
Write-Host "Registrasi uji: $($a.registration_number), $($b.registration_number), $($c.registration_number)"
Remove-Variable password,proofA,proofB,proofC,bodyA,bodyB,bodyC,bad,loginA,loginB,ownerLogin,owner,headersA,headersB -ErrorAction SilentlyContinue
