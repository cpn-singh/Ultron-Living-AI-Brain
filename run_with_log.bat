@echo off
cd /d "D:\Ultron-Living-AI-Brain"
echo === RUNNING VITE DIAGNOSTICS === > "D:\Ultron-Living-AI-Brain\debug_log.txt"
echo Current directory: %CD% >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
echo Checking node and npm... >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
call node -v >> "D:\Ultron-Living-AI-Brain\debug_log.txt" 2>&1
call npm -v >> "D:\Ultron-Living-AI-Brain\debug_log.txt" 2>&1
echo. >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
echo Testing vite build... >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
call npx vite build >> "D:\Ultron-Living-AI-Brain\debug_log.txt" 2>&1
echo. >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
echo Starting npm run dev... >> "D:\Ultron-Living-AI-Brain\debug_log.txt"
call npm run dev >> "D:\Ultron-Living-AI-Brain\debug_log.txt" 2>&1
