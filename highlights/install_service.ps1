# ORBITAL ROXA - Instalar Worker como Tarefa Agendada
# Execute este script como Administrador (uma vez só)
# Clique direito → "Executar com PowerShell como Administrador"

$taskName = "OrbitalHighlightsWorker"
$batPath = "C:\Users\vancimj\Desktop\maisum\orbital-cs2\highlights\run_worker.bat"
$logPath = "C:\Users\vancimj\Desktop\maisum\orbital-cs2\highlights\worker_service.log"

# Remover tarefa existente se houver
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Criar ação (rodar o bat)
$action = New-ScheduledTaskAction -Execute $batPath -WorkingDirectory "C:\Users\vancimj\Desktop\maisum\orbital-cs2\highlights"

# Trigger: ao fazer logon do usuário vancimj
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "vancimj"

# Configurações: reiniciar em falha, não parar se em bateria, rodar indefinidamente
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 0) `
    -StartWhenAvailable

# Registrar a tarefa
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "ORBITAL ROXA - Highlight Worker. Processa demos CS2 e gera clips automaticamente." `
    -RunLevel Highest

Write-Host ""
Write-Host "Tarefa '$taskName' criada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "O worker vai iniciar automaticamente quando voce logar no Windows."
Write-Host "Para iniciar agora:  schtasks /run /tn $taskName"
Write-Host "Para parar:          schtasks /end /tn $taskName"
Write-Host "Para remover:        schtasks /delete /tn $taskName /f"
Write-Host ""

# Perguntar se quer iniciar agora
$resp = Read-Host "Iniciar o worker agora? (s/n)"
if ($resp -eq "s") {
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Worker iniciado!" -ForegroundColor Green
}
