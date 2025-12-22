#!/bin/bash

echo "============================================================"
echo "PaddleOCR 服务启动脚本"
echo "============================================================"
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到 Python3，请先安装 Python 3.8+"
    exit 1
fi

echo "[1/3] 检查依赖..."
if ! python3 -c "import paddleocr" &> /dev/null; then
    echo "[提示] 首次运行需要安装依赖，这可能需要几分钟..."
    echo "[安装] 正在安装 PaddleOCR 依赖..."
    pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
    echo "[完成] 依赖安装成功"
else
    echo "[完成] 依赖已安装"
fi

echo ""
echo "[2/3] 启动 PaddleOCR 服务..."
echo "[提示] 首次启动会下载模型文件（约10MB），请耐心等待"
echo "[提示] 按 Ctrl+C 可停止服务"
echo ""

python3 ocr_service.py

