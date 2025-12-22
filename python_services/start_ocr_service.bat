@echo off
chcp 65001 >nul
echo ============================================================
echo PaddleOCR 服务启动脚本
echo ============================================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
pip show paddleocr >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 首次运行需要安装依赖，这可能需要几分钟...
    echo [安装] 正在安装 PaddleOCR 依赖...
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [完成] 依赖安装成功
) else (
    echo [完成] 依赖已安装
)

echo.
echo [2/3] 启动 PaddleOCR 服务...
echo [提示] 首次启动会下载模型文件（约10MB），请耐心等待
echo [提示] 按 Ctrl+C 可停止服务
echo.

python ocr_service.py

pause

