$scriptPath = "C:\Users\dkchoi\Desktop\인수증 pod\run_cj_0410_v2.py"
$outFile = "C:\Users\dkchoi\Desktop\인수증 pod\output_0410.txt"
$errFile = "C:\Users\dkchoi\Desktop\인수증 pod\error_0410.txt"

$proc = Start-Process -FilePath "python" -ArgumentList "`"$scriptPath`"" -RedirectStandardOutput $outFile -RedirectStandardError $errFile -PassThru -NoNewWindow
Write-Host "Process started with ID: $($proc.Id)"
$finished = $proc.WaitForExit(240000)
Write-Host "Finished: $finished, Exit code: $($proc.ExitCode)"
