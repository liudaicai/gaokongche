#!/bin/bash
# 启动增强版OCR服务
# Linux/Mac脚本

echo "========================================="
echo "     启动增强版身份证识别服务"
echo "========================================="
echo ""

echo "[1/3] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python，请先安装Python 3.8+"
    exit 1
fi
python3 --version
echo ""

echo "[2/3] 检查并安装依赖..."
if ! python3 -c "import paddleocr" &> /dev/null; then
    echo "正在安装依赖..."
    pip3 install -r python_services/requirements_enhanced.txt
else
    echo "依赖已安装"
fi
echo ""

echo "[3/3] 启动OCR服务..."
echo "服务地址: http://localhost:5000"
echo "按 Ctrl+C 停止服务"
echo ""
python3 python_services/ocr_service_enhanced.py
