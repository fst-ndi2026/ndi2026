@echo off
rem Publie le travail : recupere GitHub, installe les dependances, envoie les commits.
cd /d "%~dp0"
echo === git pull ===
git pull --rebase origin main || goto err
echo === npm install ===
call npm install --no-audit --no-fund || goto err
echo === git push ===
git push || goto err
echo.
echo Publication terminee. Vercel deploie dans 20 secondes.
timeout /t 8
exit /b 0
:err
echo.
echo ERREUR : lisez le message ci-dessus et prevenez Claude.
pause
exit /b 1
