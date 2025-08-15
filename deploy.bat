@echo off
echo 🚀 DEPLOYING P2P FILE SHARING SYSTEM TO GITHUB PAGES + RENDER
echo ==============================================================

echo.
echo 📦 Adding all files to git...
git add .

echo.
echo 💾 Committing changes...
git commit -m "Complete automated deployment setup - GitHub Pages + Render"

echo.
echo 🚀 Pushing to main branch (will trigger automated deployment)...
git push origin main

echo.
echo ✅ DEPLOYMENT TRIGGERED!
echo.
echo 🎯 What's happening now:
echo 1. GitHub Actions is building your frontend
echo 2. Frontend will deploy to gh-pages branch automatically
echo 3. Render will rebuild your backend automatically
echo.
echo 🌐 Your URLs will be:
echo Frontend: https://nidhishrathod.github.io/P2P-FileSharingSystem
echo Backend: https://p2p-filesharingsystem.onrender.com
echo.
echo ⏰ Wait 3-5 minutes for both services to be live
echo.
echo 📝 Cloud Computing Concepts Used:
echo ✅ Serverless Computing (GitHub Pages + Render)
echo ✅ CI/CD Pipeline (GitHub Actions)
echo ✅ Static Site Hosting (CDN)
echo ✅ Backend as a Service
echo ✅ Database (SQLite embedded)
echo ✅ WebSockets (Real-time chat)
echo.
echo 💰 Total Cost: $0 (100% Free Forever)
echo.
pause
