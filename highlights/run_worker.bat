@echo off
:: ORBITAL ROXA - Highlight Worker Service
:: Roda o worker em loop com restart automático em caso de crash

cd /d "C:\Users\vancimj\Desktop\maisum\orbital-cs2\highlights"

set HIGHLIGHTS_API_KEY=orbital-highlights-2024-secret

:loop
echo [%date% %time%] Iniciando worker...
python worker.py
echo [%date% %time%] Worker encerrou (code %errorlevel%). Reiniciando em 10s...
timeout /t 10 /nobreak >nul
goto loop
