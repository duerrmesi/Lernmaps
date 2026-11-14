@echo off
chcp 65001 >nul
title LearnMap - GitHub Upload Assistent
echo ========================================================
echo         LearnMap: GitHub Upload Assistent
echo ========================================================
echo.
echo Dieses Skript initialisiert das lokale Git-Repository
echo und laedt alle vorbereiteten Dateien zu GitHub hoch.
echo.
set /p REPO_URL="Bitte gib die URL deines GitHub-Repositories ein (z.B. https://github.com/Nutzer/learnmap.git): "

if "%REPO_URL%"=="" (
    echo Keine URL eingegeben. Abbruch.
    pause
    exit /b
)

echo.
echo Initialisiere Git Repository...
git init
git add .
git commit -m "Initial commit: LearnMap GitHub Pages Deployment"
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo Lade zu GitHub hoch...
git push -u origin main

echo.
echo ========================================================
echo Fertig! 
echo Bitte aktiviere nun GitHub Pages in deinem Repository:
echo Settings -> Pages -> Source: "GitHub Actions"
echo ========================================================
echo.
pause
