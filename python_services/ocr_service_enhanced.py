#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版 PaddleOCR 服务
提供高精度身份证和营业执照识别接口
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
import re
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化 PaddleOCR
logger.info('正在初始化 PaddleOCR...')
ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
logger.info('PaddleOCR 初始化完成')


def preprocess_image(image):
    """
    图像预处理 - 提高识别准确度
    
    Args:
        image: PIL Image对象
        
    Returns:
        PIL Image: 预处理后的图像
    """
    # 转换为numpy数组
    img_array = np.array(image)
    
    # 如果是RGBA，转换为RGB
    if len(img_array.shape) == 3 and img_array.shape[2] == 4:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
    
    # 转换为灰度图
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # 1. 去噪
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    
    # 2. 对比度增强（CLAHE）
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    
    # 3. 锐化
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)
    
    # 4. 自适应二值化
    binary = cv2.adaptiveThreshold(
        sharpened, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )
    
    # 转换回PIL Image
    processed_image = Image.fromarray(binary)
    
    logger.info(f'图像预处理完成: {image.size} -> {processed_image.size}')
    return processed_image


def correct_common_errors(text):
    """
    修正常见的OCR识别错误
    
    Args:
        text: 识别的文本
        
    Returns:
        str: 修正后的文本
    """
    # 常见错误映射
    corrections = {
        # 数字容易识别错误
        'O': '0', 'o': '0',  # O -> 0
        'I': '1', 'l': '1',  # I/l -> 1
        'Z': '2',            # Z -> 2
        'S': '5', 's': '5',  # S -> 5
        'B': '8',            # B -> 8
        'g': '9',            # g -> 9
        
        # 中文容易识别错误
        '土': '±',
        '汉': '漢',
    }
    
    corrected = text
    for wrong, correct in corrections.items():
        corrected = corrected.replace(wrong, correct)
    
    return corrected


def validate_id_number(id_number):
    """
    验证身份证号码格式和校验位
    
    Args:
        id_number: 身份证号码字符串
        
    Returns:
        tuple: (是否有效, 修正后的身份证号, 错误信息)
    """
    if not id_number:
        return False, None, "身份证号为空"
    
    # 移除空格
    id_number = id_number.replace(' ', '').upper()
    
    # 长度检查
    if len(id_number) != 18:
        return False, id_number, f"身份证号长度错误: {len(id_number)}"
    
    # 格式检查：前17位数字，最后一位数字或X
    if not re.match(r'^\d{17}[\dX]$', id_number):
        return False, id_number, "身份证号格式错误"
    
    # 提取日期信息
    try:
        year = int(id_number[6:10])
        month = int(id_number[10:12])
        day = int(id_number[12:14])
        
        # 日期合理性检查
        birth_date = datetime(year, month, day)
        today = datetime.now()
        
        if birth_date > today:
            return False, id_number, "出生日期不能晚于今天"
        
        age = (today - birth_date).days // 365
        if age < 0 or age > 150:
            return False, id_number, f"年龄不合理: {age}岁"
            
    except ValueError as e:
        return False, id_number, f"日期无效: {str(e)}"
    
    # 校验位计算
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    check_codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    
    sum_val = sum(int(id_number[i]) * weights[i] for i in range(17))
    check_digit = check_codes[sum_val % 11]
    
    if id_number[17] != check_digit:
        # 尝试修正校验位
        corrected_id = id_number[:17] + check_digit
        return True, corrected_id, f"校验位已自动修正: {id_number[17]} -> {check_digit}"
    
    return True, id_number, "验证通过"


def extract_gender_from_id(id_number):
    """
    从身份证号提取性别
    
    Args:
        id_number: 18位身份证号
        
    Returns:
        str: '男' 或 '女'
    """
    if len(id_number) >= 17:
        gender_digit = int(id_number[16])
        return '男' if gender_digit % 2 == 1 else '女'
    return None


def extract_birth_from_id(id_number):
    """
    从身份证号提取出生日期
    
    Args:
        id_number: 18位身份证号
        
    Returns:
        str: YYYY-MM-DD格式的日期
    """
    if len(id_number) >= 14:
        year = id_number[6:10]
        month = id_number[10:12]
        day = id_number[12:14]
        return f"{year}-{month}-{day}"
    return None


def parse_idcard(text_results):
    """
    增强版身份证解析
    
    Args:
        text_results: PaddleOCR 识别结果
        
    Returns:
        dict: 解析后的身份证信息（包含置信度）
    """
    if not text_results or not text_results[0]:
        return {}
    
    # 提取所有文本和置信度
    texts = []
    confidences = []
    
    for line in text_results[0]:
        if line and len(line) > 1:
            text = line[1][0] if isinstance(line[1], tuple) else line[1]
            confidence = line[1][1] if isinstance(line[1], tuple) and len(line[1]) > 1 else 0.9
            
            # 纠正常见错误
            corrected_text = correct_common_errors(text.strip())
            texts.append(corrected_text)
            confidences.append(confidence)
    
    full_text = ' '.join(texts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    logger.info(f'身份证识别文本: {full_text}')
    logger.info(f'平均置信度: {avg_confidence:.2%}')
    
    result = {
        '_confidence': avg_confidence,
        '_warnings': []
    }
    
    # 1. 身份证号（最重要，优先识别）
    id_patterns = [
        r'(\d{17}[\dXx])',  # 标准18位
        r'(\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])',  # 严格格式
    ]
    
    id_number = None
    for pattern in id_patterns:
        id_match = re.search(pattern, full_text)
        if id_match:
            id_number = id_match.group(1).upper()
            break
    
    if id_number:
        # 验证并修正身份证号
        is_valid, corrected_id, msg = validate_id_number(id_number)
        if is_valid:
            result['idNumber'] = corrected_id
            if corrected_id != id_number:
                result['_warnings'].append(msg)
            
            # 从身份证号提取其他信息
            extracted_gender = extract_gender_from_id(corrected_id)
            extracted_birth = extract_birth_from_id(corrected_id)
            
            if extracted_gender:
                result['_extractedGender'] = extracted_gender
            if extracted_birth:
                result['_extractedBirth'] = extracted_birth
        else:
            result['_warnings'].append(f"身份证号可能有误: {msg}")
            result['idNumber'] = id_number
    
    # 2. 姓名
    for pattern in [
        r'姓名\s*[:：]?\s*([^\s\d]{2,4})',
        r'姓\s*名\s*[:：]?\s*([^\s\d]{2,4})'
    ]:
        name_match = re.search(pattern, full_text)
        if name_match:
            result['name'] = name_match.group(1).strip()
            break
    
    # 3. 性别
    gender_match = re.search(r'性别\s*[:：]?\s*([男女])', full_text)
    if gender_match:
        result['gender'] = gender_match.group(1)
        
        # 如果性别与身份证号提取的性别不一致，标记警告
        if '_extractedGender' in result and result['gender'] != result['_extractedGender']:
            result['_warnings'].append(
                f"性别不一致: OCR识别为'{result['gender']}', 身份证号计算为'{result['_extractedGender']}'"
            )
    elif '_extractedGender' in result:
        # 如果OCR没识别到性别，使用身份证号提取的性别
        result['gender'] = result['_extractedGender']
        result['_warnings'].append("性别从身份证号自动提取")
    
    # 4. 民族
    nation_match = re.search(r'民族\s*[:：]?\s*([^\s]{2,4})', full_text)
    if nation_match:
        result['nationality'] = nation_match.group(1)
    
    # 5. 出生日期
    birth_patterns = [
        r'出生\s*[:：]?\s*(\d{4})\s*年?\s*(\d{1,2})\s*月?\s*(\d{1,2})',
        r'(\d{4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})'
    ]
    
    for pattern in birth_patterns:
        birth_match = re.search(pattern, full_text)
        if birth_match:
            year, month, day = birth_match.groups()
            result['birth'] = f'{year}-{month.zfill(2)}-{day.zfill(2)}'
            break
    
    # 如果OCR没识别到出生日期，使用身份证号提取的
    if 'birth' not in result and '_extractedBirth' in result:
        result['birth'] = result['_extractedBirth']
        result['_warnings'].append("出生日期从身份证号自动提取")
    
    # 6. 地址
    address_patterns = [
        r'住址\s*[:：]?\s*([^\n]+)',
        r'住所\s*[:：]?\s*([^\n]+)',
        r'地址\s*[:：]?\s*([^\n]+)'
    ]
    
    for pattern in address_patterns:
        address_match = re.search(pattern, full_text)
        if address_match:
            result['address'] = address_match.group(1).strip()
            break
    
    # 评估识别质量
    required_fields = ['name', 'idNumber', 'gender', 'birth']
    missing_fields = [f for f in required_fields if f not in result]
    
    if missing_fields:
        result['_warnings'].append(f"缺少字段: {', '.join(missing_fields)}")
    
    result['_quality'] = 'high' if avg_confidence > 0.9 and not missing_fields else \
                         'medium' if avg_confidence > 0.7 else 'low'
    
    logger.info(f'身份证解析结果: {result}')
    logger.info(f'识别质量: {result["_quality"]}, 警告数: {len(result["_warnings"])}')
    
    return result


def validate_credit_code(code):
    """
    验证统一社会信用代码
    
    Args:
        code: 18位统一社会信用代码
        
    Returns:
        tuple: (是否有效, 修正后的代码, 错误信息)
    """
    if not code:
        return False, None, "信用代码为空"
    
    code = code.replace(' ', '').upper()
    
    if len(code) != 18:
        return False, code, f"信用代码长度错误: {len(code)}"
    
    # 格式检查：18位大写字母和数字
    if not re.match(r'^[0-9A-Z]{18}$', code):
        return False, code, "信用代码格式错误"
    
    return True, code, "验证通过"


def parse_business_license(text_results):
    """
    增强版营业执照解析
    
    Args:
        text_results: PaddleOCR 识别结果
        
    Returns:
        dict: 解析后的营业执照信息（包含置信度）
    """
    if not text_results or not text_results[0]:
        return {}
    
    # 提取所有文本和置信度
    texts = []
    confidences = []
    
    for line in text_results[0]:
        if line and len(line) > 1:
            text = line[1][0] if isinstance(line[1], tuple) else line[1]
            confidence = line[1][1] if isinstance(line[1], tuple) and len(line[1]) > 1 else 0.9
            
            corrected_text = correct_common_errors(text.strip())
            texts.append(corrected_text)
            confidences.append(confidence)
    
    full_text = ' '.join(texts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    logger.info(f'营业执照识别文本: {full_text}')
    logger.info(f'平均置信度: {avg_confidence:.2%}')
    
    result = {
        '_confidence': avg_confidence,
        '_warnings': []
    }
    
    # 1. 企业名称
    for pattern in [
        r'名称\s*[:：]?\s*([^\n]+)',
        r'企业名称\s*[:：]?\s*([^\n]+)',
        r'公司名称\s*[:：]?\s*([^\n]+)'
    ]:
        name_match = re.search(pattern, full_text)
        if name_match:
            result['companyName'] = name_match.group(1).strip()
            break
    
    # 如果没找到，尝试找最长的文本行
    if 'companyName' not in result and texts:
        longest_text = max(texts, key=len)
        if len(longest_text) > 5 and '营业执照' not in longest_text:
            result['companyName'] = longest_text
            result['_warnings'].append("企业名称从最长文本行提取，请核对")
    
    # 2. 统一社会信用代码
    credit_match = re.search(r'([0-9A-Z]{18})', full_text)
    if credit_match:
        credit_code = credit_match.group(1)
        is_valid, corrected_code, msg = validate_credit_code(credit_code)
        if is_valid:
            result['creditCode'] = corrected_code
        else:
            result['_warnings'].append(f"信用代码可能有误: {msg}")
            result['creditCode'] = credit_code
    
    # 3. 地址
    for pattern in [
        r'住所\s*[:：]?\s*([^\n]+)',
        r'地址\s*[:：]?\s*([^\n]+)',
        r'营业场所\s*[:：]?\s*([^\n]+)',
        r'经营场所\s*[:：]?\s*([^\n]+)'
    ]:
        address_match = re.search(pattern, full_text)
        if address_match:
            result['address'] = address_match.group(1).strip()
            break
    
    # 4. 法定代表人
    for pattern in [
        r'法定代表人\s*[:：]?\s*([^\s\d]{2,4})',
        r'法人\s*[:：]?\s*([^\s\d]{2,4})',
        r'代表人\s*[:：]?\s*([^\s\d]{2,4})'
    ]:
        legal_match = re.search(pattern, full_text)
        if legal_match:
            result['legalPerson'] = legal_match.group(1).strip()
            break
    
    # 5. 注册日期
    date_patterns = [
        r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日',
        r'(\d{4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})'
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, full_text)
        if date_match:
            year, month, day = date_match.groups()
            result['registerDate'] = f'{year}-{month.zfill(2)}-{day.zfill(2)}'
            break
    
    # 评估识别质量
    required_fields = ['companyName', 'creditCode']
    missing_fields = [f for f in required_fields if f not in result]
    
    if missing_fields:
        result['_warnings'].append(f"缺少字段: {', '.join(missing_fields)}")
    
    result['_quality'] = 'high' if avg_confidence > 0.9 and not missing_fields else \
                         'medium' if avg_confidence > 0.7 else 'low'
    
    logger.info(f'营业执照解析结果: {result}')
    logger.info(f'识别质量: {result["_quality"]}, 警告数: {len(result["_warnings"])}')
    
    return result


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({'ok': True, 'service': 'Enhanced PaddleOCR', 'status': 'running', 'version': '2.0'})


@app.route('/ocr/idcard', methods=['POST'])
def recognize_idcard():
    """
    增强版身份证识别接口
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        use_preprocessing = data.get('preprocessing', False)  # 默认禁用预处理，避免错误
        
        if not image_base64:
            logger.warning('请求缺少图片数据')
            return jsonify({'ok': False, 'error': '缺少图片数据'}), 400
        
        # 解码 Base64
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            logger.info(f'接收到身份证图片，尺寸: {image.size}')
        except Exception as e:
            logger.error(f'图片解码失败: {str(e)}')
            return jsonify({'ok': False, 'error': '图片格式错误'}), 400
        
        # 图像预处理（暂时禁用，调试用）
        processed_image = image
        
        # 如果启用预处理
        if use_preprocessing:
            try:
                logger.info('开始图像预处理...')
                processed_image = preprocess_image(image)
                logger.info('图像预处理完成')
            except Exception as e:
                logger.warning(f'图像预处理失败，使用原图: {str(e)}', exc_info=True)
                processed_image = image
        
        # OCR 识别
        logger.info('开始识别身份证...')
        logger.info(f'图片尺寸: {processed_image.size}, 模式: {processed_image.mode}')
        
        # 转换为numpy数组
        try:
            img_array = np.array(processed_image)
            logger.info(f'转换后数组shape: {img_array.shape}')
        except Exception as e:
            logger.error(f'转换numpy数组失败: {str(e)}', exc_info=True)
            raise
        
        # 调用OCR
        result = ocr.ocr(img_array, cls=True)
        
        if not result or not result[0]:
            logger.warning('未识别到文字')
            return jsonify({
                'ok': False,
                'error': '未识别到文字，请确保图片清晰且光线充足'
            }), 400
        
        # 解析结果
        parsed_result = parse_idcard(result)
        
        if not parsed_result or 'idNumber' not in parsed_result:
            logger.warning('未能解析出身份证号')
            return jsonify({
                'ok': False,
                'error': '无法识别身份证号，请确保图片包含完整的身份证信息',
                'data': parsed_result
            }), 400
        
        logger.info('身份证识别成功')
        return jsonify({'ok': True, 'data': parsed_result})
    
    except Exception as e:
        logger.error(f'身份证识别失败: {str(e)}', exc_info=True)
        return jsonify({'ok': False, 'error': f'识别失败: {str(e)}'}), 500


@app.route('/ocr/business-license', methods=['POST'])
def recognize_business_license():
    """
    增强版营业执照识别接口
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        use_preprocessing = data.get('preprocessing', False)  # 默认禁用预处理，避免错误
        
        if not image_base64:
            logger.warning('请求缺少图片数据')
            return jsonify({'ok': False, 'error': '缺少图片数据'}), 400
        
        # 解码 Base64
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            logger.info(f'接收到营业执照图片，尺寸: {image.size}')
        except Exception as e:
            logger.error(f'图片解码失败: {str(e)}')
            return jsonify({'ok': False, 'error': '图片格式错误'}), 400
        
        # 图像预处理
        if use_preprocessing:
            try:
                processed_image = preprocess_image(image)
            except Exception as e:
                logger.warning(f'图像预处理失败，使用原图: {str(e)}')
                processed_image = image
        else:
            processed_image = image
        
        # OCR 识别
        logger.info('开始识别营业执照...')
        result = ocr.ocr(np.array(processed_image), cls=True)
        
        if not result or not result[0]:
            logger.warning('未识别到文字')
            return jsonify({
                'ok': False,
                'error': '未识别到文字，请确保图片清晰且光线充足'
            }), 400
        
        # 解析结果
        parsed_result = parse_business_license(result)
        
        if not parsed_result or ('companyName' not in parsed_result and 'creditCode' not in parsed_result):
            logger.warning('未能解析出营业执照关键信息')
            return jsonify({
                'ok': False,
                'error': '无法识别营业执照信息，请确保图片包含完整的营业执照',
                'data': parsed_result
            }), 400
        
        logger.info('营业执照识别成功')
        return jsonify({'ok': True, 'data': parsed_result})
    
    except Exception as e:
        logger.error(f'营业执照识别失败: {str(e)}', exc_info=True)
        return jsonify({'ok': False, 'error': f'识别失败: {str(e)}'}), 500


if __name__ == '__main__':
    logger.info('=' * 60)
    logger.info('增强版 PaddleOCR 服务启动中...')
    logger.info('服务地址: http://0.0.0.0:5000')
    logger.info('新增功能:')
    logger.info('  - 图像预处理（去噪、增强、二值化）')
    logger.info('  - 智能纠错（常见错误自动修正）')
    logger.info('  - 身份证号校验与自动修正')
    logger.info('  - 置信度评估')
    logger.info('  - 交叉验证（性别、出生日期）')
    logger.info('=' * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
