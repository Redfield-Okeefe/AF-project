# Run locally in server-contoh with PostgreSQL migrated, Mailpit and npm start running.
$ErrorActionPreference='Stop'
$base='http://127.0.0.1:3001'
function Assert-Status($method,$path,$headers,$body,$expected){
    $params=@{Uri="$base$path";Method=$method;ErrorAction='Stop';UseBasicParsing=$true}
    if($headers){$params.Headers=$headers}
    if($null -ne $body){$params.ContentType='application/json';$params.Body=($body|ConvertTo-Json -Compress)}
    $response=$null
    try{$response=Invoke-WebRequest @params;$status=[int]$response.StatusCode}
    catch{if(-not $_.Exception.Response){throw};$status=[int]$_.Exception.Response.StatusCode}
    if($status -ne $expected){throw "$method $path : expected $expected, actual $status"}
    Write-Host "PASS $method $path ($status)" -ForegroundColor Green
    if($response -and $response.Content){return ($response.Content|ConvertFrom-Json)}
}
function Read-Secret($prompt){[System.Net.NetworkCredential]::new('',(Read-Host $prompt -AsSecureString)).Password}
$null=Assert-Status GET '/api/v1/health' $null $null 200
$ownerLogin=Assert-Status POST '/api/v1/auth/login' $null @{email='owner@bnr.test';password=(Read-Secret 'Password dummy Owner');role='owner'} 200
$owner=@{Authorization="Bearer $($ownerLogin.token)"}
$root='/api/v1/auth/coach'
$run=[guid]::NewGuid().ToString('N').Substring(0,12)
$email="coach-3c-$run@bnr.test"
$password='Test'+[guid]::NewGuid().ToString('N')
try{
    $request=Assert-Status POST "$root/otp/request" $null @{email=$email} 201
    if(-not $request.challenge_id -or $request.expiresIn -ne 300){throw 'Unexpected OTP response'}
    $null=Assert-Status POST "$root/otp/request" $null @{email=$email} 429
    $code=Read-Secret "OTP dari Mailpit untuk $email"
    $form=@{email=$email;nama='Uji Fase3C Pelatih';wa='081234567890';lisensi='';password=$password;password_confirmation=$password;challenge_id=$request.challenge_id;code=$code;peran='pelatih'}
    $bad=$form.Clone();$bad.password_confirmation='wrong'
    $null=Assert-Status POST "$root/register" $null $bad 400
    $created=Assert-Status POST "$root/register" $null $form 201
    if($created.user.status -ne 'menunggu' -or -not $created.restricted -or -not $created.token){throw 'Expected restricted pending account'}
    if($created.user.password_hash){throw 'Password hash leaked'}
    $headers=@{Authorization="Bearer $($created.token)"}
    $null=Assert-Status GET '/api/v1/auth/me' $headers $null 401
    $null=Assert-Status GET '/api/v1/owner/coaches' $headers $null 401
    $null=Assert-Status POST "$root/register" $null $form 409
    $null=Assert-Status POST '/api/v1/auth/login' $null @{email=$email;password=$password;role='pelatih'} 403
    $pending=Assert-Status POST "$root/login" $null @{email=$email;password=$password} 200
    if(-not $pending.restricted){throw 'Expected restricted login'}
    $list=Assert-Status GET '/api/v1/owner/coaches' $owner $null 200
    if(-not ($list.coaches|Where-Object {$_.id -eq $created.user.id})){throw 'Owner list missing coach'}
    $path="/api/v1/owner/coaches/$($created.user.id)/status"
    $null=Assert-Status PATCH $path $owner @{status='ditolak';alasan=''} 400
    $null=Assert-Status PATCH $path $owner @{status='ditolak';alasan='Uji penolakan fiktif'} 200
    $rejected=Assert-Status GET "$root/status" $headers $null 200
    if($rejected.user.status -ne 'ditolak' -or -not $rejected.user.alasan -or $rejected.token){throw 'Expected rejected status and reason'}
    $null=Assert-Status PATCH $path $owner @{status='aktif'} 200
    $approved=Assert-Status GET "$root/status" $headers $null 200
    if($approved.user.status -ne 'aktif' -or -not $approved.token){throw 'Expected active account and upgraded token'}
    $active=@{Authorization="Bearer $($approved.token)"}
    $null=Assert-Status GET '/api/v1/auth/check/pelatih' $active $null 200
    $null=Assert-Status GET '/api/v1/owner/coaches' $active $null 403
    $null=Assert-Status PATCH $path $active @{status='nonaktif'} 403
    $null=Assert-Status PATCH $path $owner @{status='nonaktif'} 200
    $null=Assert-Status GET '/api/v1/auth/me' $active $null 401
    $null=Assert-Status GET "$root/status" $active $null 401
    $null=Assert-Status PATCH $path $owner @{status='aktif'} 200
    $null=Assert-Status POST '/api/v1/auth/login' $null @{email=$email;password=$password;role='pelatih'} 200
    Write-Host 'Semua pemeriksaan Fase 3C di atas lulus. Data fiktif dan audit dipertahankan.' -ForegroundColor Green
}finally{
    Remove-Variable password,code,form,bad,ownerLogin,owner,created,pending,approved,active,headers -ErrorAction SilentlyContinue
}
