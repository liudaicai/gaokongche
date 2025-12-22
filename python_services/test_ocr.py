#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PaddleOCR 诊断脚本
测试 PaddleOCR 是否能正常工作
"""

import sys
import os

# 禁用代理
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

print("=" * 60)
print("PaddleOCR 诊断测试")
print("=" * 60)

# 测试 1: 导入库
print("\n[测试 1] 导入必要的库...")
try:
    import numpy as np
    from PIL import Image
    from paddleocr import PaddleOCR
    print("✓ 所有库导入成功")
except Exception as e:
    print(f"✗ 库导入失败: {e}")
    sys.exit(1)

# 测试 2: 初始化 PaddleOCR
print("\n[测试 2] 初始化 PaddleOCR...")
try:
    ocr = PaddleOCR(
        use_angle_cls=False,  # 禁用角度分类以简化测试
        lang='ch',
        use_gpu=False,
        show_log=False
    )
    print("✓ PaddleOCR 初始化成功")
except Exception as e:
    print(f"✗ PaddleOCR 初始化失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试 3: 创建测试图片
print("\n[测试 3] 创建测试图片...")
try:
    # 创建一个简单的白色背景图片，上面有黑色文字
    img = Image.new('RGB', (200, 50), color='white')
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    
    # 使用默认字体绘制文本
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("C:/Windows/Fonts/simhei.ttf", 20)
    except:
        # 如果失败，使用默认字体
        font = ImageFont.load_default()
    
    draw.text((10, 10), "测试文字", fill='black', font=font)
    
    # 转换为 numpy 数组
    img_array = np.array(img, dtype=np.uint8)
    print(f"✓ 测试图片创建成功: {img_array.shape}, dtype: {img_array.dtype}")
except Exception as e:
    print(f"✗ 测试图片创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试 4: OCR 识别
print("\n[测试 4] 执行 OCR 识别...")
try:
    result = ocr.ocr(img_array, cls=False)
    print(f"✓ OCR 识别成功")
    print(f"  结果类型: {type(result)}")
    print(f"  结果长度: {len(result) if result else 0}")
    if result and len(result) > 0:
        print(f"  第一页结果: {result[0]}")
except Exception as e:
    print(f"✗ OCR 识别失败: {e}")
    import traceback
    traceback.print_exc()
    
    # 尝试获取更多错误信息
    print("\n[调试信息]")
    print(f"  NumPy 版本: {np.__version__}")
    print(f"  图片数组信息:")
    print(f"    - 形状: {img_array.shape}")
    print(f"    - 数据类型: {img_array.dtype}")
    print(f"    - 是否连续: {img_array.flags['C_CONTIGUOUS']}")
    print(f"    - 最小值: {img_array.min()}")
    print(f"    - 最大值: {img_array.max()}")
    sys.exit(1)

print("\n" + "=" * 60)
print("所有测试通过！PaddleOCR 工作正常")
print("=" * 60)
