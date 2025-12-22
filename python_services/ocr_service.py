#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PaddleOCR 服务
提供身份证和营业执照识别接口
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image
import numpy as np
import re
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化 PaddleOCR
# use_angle_cls=True: 支持旋转文字识别
# lang='ch': 中文识别
logger.info('正在初始化 PaddleOCR...')
ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
logger.info('PaddleOCR 初始化完成')


def parse_idcard(text_results):
    """
    解析身份证识别结果
    
    Args:
        text_results: PaddleOCR 识别结果
        
    Returns:
        dict: 解析后的身份证信息
    """
    if not text_results or not text_results[0]:
        return {}
    
    # 提取所有文本
    texts = []
    for line in text_results[0]:
        if line and len(line) > 1:
            text = line[1][0] if isinstance(line[1], tuple) else line[1]
            texts.append(text.strip())
    
    full_text = ' '.join(texts)
    logger.info(f'身份证识别文本: {full_text}')
    
    result = {}
    
    # 姓名解析（优先取最开头的纯汉字）
    # 先尝试获取开头的姓名（最可靠）
    first_name_match = re.match(r'^([^\s\d]{2,4})\s', full_text)
    if first_name_match:
        first_name = first_name_match.group(1).strip()
        # 排除常见的错误识别（如"性出"、"别男"等不像姓名的）
        if not re.search(r'[性别出生民族]', first_name):
            result['name'] = first_name
    
    # 如果开头没有找到，再尝试标准格式
    if 'name' not in result:
        name_patterns = [
            r'姓名\s*[:：]?\s*([^\s\d]{2,4})',  # 标准格式：姓名：张三
            r'姓\s*名\s*[:：]?\s*([^\s\d]{2,4})',  # 姓 名：张三
        ]
        for pattern in name_patterns:
            name_match = re.search(pattern, full_text)
            if name_match:
                name_candidate = name_match.group(1).strip()
                # 同样排除明显错误的
                if not re.search(r'[性别出生民族]', name_candidate):
                    result['name'] = name_candidate
                    break
    
    # 身份证号（18位数字或17位数字+X）
    id_match = re.search(r'(\d{17}[\dXx])', full_text)
    if id_match:
        result['idNumber'] = id_match.group(1).upper()
    
    # 性别
    gender_match = re.search(r'性别\s*[:：]?\s*([男女])', full_text)
    if gender_match:
        result['gender'] = gender_match.group(1)
    
    # 民族
    nation_patterns = [
        r'民族\s*[:：]?\s*([^\s\d]{2,4})',  # 民族：汉
        r'民族([^\s\d]{2,4})',  # 民族汉
    ]
    for pattern in nation_patterns:
        nation_match = re.search(pattern, full_text)
        if nation_match:
            result['nationality'] = nation_match.group(1).strip()
            break
    
    # 出生日期
    birth_patterns = [
        r'出生\s*[:：]?\s*(\d{4})\s*年?\s*(\d{1,2})\s*月?\s*(\d{1,2})',  # 出生：1990年1月1日
        r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日',  # 1990年1月1日
    ]
    for pattern in birth_patterns:
        birth_match = re.search(pattern, full_text)
        if birth_match:
            year, month, day = birth_match.groups()
            result['birth'] = f'{year}-{month.zfill(2)}-{day.zfill(2)}'
            break
    
    # 地址（可能没有"住址"标签）
    address_patterns = [
        r'住址\s*[:：]?\s*([^\n]+)',  # 住址：北京市...
        # 匹配完整地址（包括省/直辖市开头）
        r'((?:北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)(?:省|市|自治区|特别行政区)?[^\d公民身份号]{2,50}(?:号|室|楼|层|组)?)',
        r'([^\d]{2}(?:省|市)[^\d公民身份号]{2,50}(?:号|室|楼|层|组)?)',  # 其他省市开头
    ]
    for pattern in address_patterns:
        address_match = re.search(pattern, full_text)
        if address_match:
            addr = address_match.group(1).strip()
            # 清理地址末尾可能的杂项
            addr = re.sub(r'\s*(?:公民身份|身份证|号码).*$', '', addr)
            # 去掉多余空格
            addr = re.sub(r'\s+', '', addr)
            result['address'] = addr
            break
    
    logger.info(f'身份证解析结果: {result}')
    return result


def parse_business_license(text_results):
    """
    解析营业执照识别结果
    
    Args:
        text_results: PaddleOCR 识别结果
        
    Returns:
        dict: 解析后的营业执照信息
    """
    if not text_results or not text_results[0]:
        return {}
    
    # 提取所有文本
    texts = []
    for line in text_results[0]:
        if line and len(line) > 1:
            text = line[1][0] if isinstance(line[1], tuple) else line[1]
            texts.append(text.strip())
    
    full_text = ' '.join(texts)
    logger.info(f'营业执照识别文本: {full_text}')
    
    result = {}
    
    # 企业名称解析（精确提取，避免包含类型信息）
    name_patterns = [
        # 匹配 "称深圳市...有限公司" 但不包括后面的 "类型"
        r'称\s*[:：]?\s*([^\s类型]{4,50}?(?:有限公司|股份有限公司|有限责任公司|集团有限公司))',
        # 匹配 "名称：深圳市...有限公司"
        r'名称\s*[:：]?\s*([^\s类型]{4,50}?(?:有限公司|股份有限公司|有限责任公司|集团有限公司))',
        # 匹配其他公司类型
        r'称\s*[:：]?\s*([^住法类型]{4,50}?(?:公司|企业|厂|店|中心|工作室))',
        r'名称\s*[:：]?\s*([^住法类型]{4,50}?(?:公司|企业|厂|店|中心|工作室))',
    ]
    
    for pattern in name_patterns:
        name_match = re.search(pattern, full_text)
        if name_match:
            company_name = name_match.group(1).strip()
            # 进一步清理：去除后面可能的类型描述
            company_name = re.sub(r'\s+(类|型).*$', '', company_name)
            # 排除明显错误（包含提示文字、网址等）
            if not re.search(r'(提示|登录|查询|网址|扫描|二维码|监制|公示|信用|审批|许可)', company_name):
                result['companyName'] = company_name
                break
    
    # 如果还没找到，尝试其他方式
    if 'companyName' not in result:
        # 查找包含公司关键词的文本行
        for text in texts:
            if re.search(r'(?:有限公司|股份有限公司|有限责任公司)', text):
                if len(text) > 5 and len(text) < 50:
                    if not re.search(r'(营业执照|提示|登录|查询|网址)', text):
                        result['companyName'] = text
                        break
    
    # 统一社会信用代码（18位，字母+数字）
    credit_match = re.search(r'([0-9A-Z]{18})', full_text)
    if credit_match:
        result['creditCode'] = credit_match.group(1)
    
    # 法定代表人（多种模式匹配）
    legal_patterns = [
        r'法定代表人\s*[:：]?\s*([^\s\d]{2,4})',  # 法定代表人：张三
        r'代表人\s*[:：]?\s*([^\s\d]{2,4})',  # 代表人：张三
        r'法人\s*[:：]?\s*([^\s\d]{2,4})',  # 法人：张三
        r'人\s*([^\s\d]{2,4})\s*住',  # 人陈思思 住
        # 公司名后面的姓名（如：深圳...有限公司 邹定鸿 有限责任公司）
        r'(?:有限公司|股份有限公司)\s+([^\s\d]{2,4})\s+(?:有限责任|类)',
        # 在公司名称和"有限责任公司"之间的姓名
        r'(?:公司|企业)\s+([^\s\d]{2,4})\s+有限',
    ]
    for pattern in legal_patterns:
        legal_match = re.search(pattern, full_text)
        if legal_match:
            legal_person = legal_match.group(1).strip()
            # 排除明显错误
            if legal_person not in ['深圳', '有限', '责任', '股份', '集团', '国际']:
                result['legalPerson'] = legal_person
                break
    
    # 地址（处理多种格式）
    address_patterns = [
        r'住\s*所\s*[:：]?\s*([^\n重要提示]{5,})',  # 住 所 深圳市...
        r'住所\s*[:：]?\s*([^\n重要提示]{5,})',  # 住所：...
        r'地址\s*[:：]?\s*([^\n重要提示]{5,})',  # 地址：...
        r'营业场所\s*[:：]?\s*([^\n重要提示]{5,})',  # 营业场所：...
        # 处理"住 登记机关 所"这种格式
        r'所\s+([^\n重要提示登记]{5,})',  # 所 深圳市...（跳过"登记机关"）
    ]
    for pattern in address_patterns:
        address_match = re.search(pattern, full_text)
        if address_match:
            addr = address_match.group(1).strip()
            # 清理地址前缀（去除干扰文字）
            addr = re.sub(r'^(?:厂|场|登记机关|SCJDGL|SGJDGL|CJDGL|GJDGI)\s*', '', addr)
            # 清理地址后缀（去除多余内容）
            addr = re.sub(r'\s*(?:SCJDGL|SGJDGL|CJDGL|GJDGI|重要|提示|登记机关|成立日期|月|日|年).*$', '', addr)
            # 去除所有空格（包括中间的）
            addr = re.sub(r'\s+', '', addr)
            # 确保地址有效（至少包含省市信息）
            if len(addr) >= 10 and re.search(r'(?:省|市|区|县|街道|路|号)', addr):
                result['address'] = addr
                break
    
    # 注册日期
    date_match = re.search(r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日', full_text)
    if date_match:
        year, month, day = date_match.groups()
        result['registerDate'] = f'{year}-{month.zfill(2)}-{day.zfill(2)}'
    
    logger.info(f'营业执照解析结果: {result}')
    return result


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({'ok': True, 'service': 'PaddleOCR', 'status': 'running'})


@app.route('/ocr/idcard', methods=['POST'])
def recognize_idcard():
    """
    身份证识别接口
    
    请求格式:
    {
        "image": "base64_encoded_image_string"
    }
    
    响应格式:
    {
        "ok": true,
        "data": {
            "name": "张三",
            "idNumber": "110101199001011234",
            "address": "北京市东城区...",
            "gender": "男",
            "nationality": "汉",
            "birth": "1990-01-01"
        }
    }
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            logger.warning('请求缺少图片数据')
            return jsonify({'ok': False, 'error': '缺少图片数据'}), 400
        
        # 解码 Base64
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            logger.info(f'接收到身份证图片，尺寸: {image.size}, 模式: {image.mode}')
            
            # 转换图片为RGB模式（处理PNG透明通道等问题）
            if image.mode != 'RGB':
                logger.info(f'转换图片模式: {image.mode} -> RGB')
                image = image.convert('RGB')
        except Exception as e:
            logger.error(f'图片解码失败: {str(e)}')
            return jsonify({'ok': False, 'error': '图片格式错误'}), 400
        
        # OCR 识别
        logger.info('开始识别身份证...')
        # 转换PIL Image为numpy数组
        img_array = np.array(image)
        result = ocr.ocr(img_array, cls=True)
        
        if not result or not result[0]:
            logger.warning('未识别到文字')
            return jsonify({'ok': False, 'error': '未识别到文字，请确保图片清晰'}), 400
        
        # 解析结果
        parsed_result = parse_idcard(result)
        
        if not parsed_result:
            logger.warning('解析结果为空')
            return jsonify({'ok': False, 'error': '无法解析身份证信息'}), 400
        
        logger.info('身份证识别成功')
        return jsonify({'ok': True, 'data': parsed_result})
    
    except Exception as e:
        logger.error(f'身份证识别失败: {str(e)}', exc_info=True)
        return jsonify({'ok': False, 'error': f'识别失败: {str(e)}'}), 500


@app.route('/ocr/business-license', methods=['POST'])
def recognize_business_license():
    """
    营业执照识别接口
    
    请求格式:
    {
        "image": "base64_encoded_image_string"
    }
    
    响应格式:
    {
        "ok": true,
        "data": {
            "companyName": "北京某某科技有限公司",
            "creditCode": "91110000MA01234567",
            "address": "北京市朝阳区...",
            "legalPerson": "李四",
            "registerDate": "2020-01-01"
        }
    }
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            logger.warning('请求缺少图片数据')
            return jsonify({'ok': False, 'error': '缺少图片数据'}), 400
        
        # 解码 Base64
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            logger.info(f'接收到营业执照图片，尺寸: {image.size}, 模式: {image.mode}')
            
            # 转换图片为RGB模式（处理PNG透明通道等问题）
            if image.mode != 'RGB':
                logger.info(f'转换图片模式: {image.mode} -> RGB')
                image = image.convert('RGB')
        except Exception as e:
            logger.error(f'图片解码失败: {str(e)}')
            return jsonify({'ok': False, 'error': '图片格式错误'}), 400
        
        # OCR 识别
        logger.info('开始识别营业执照...')
        # 转换PIL Image为numpy数组
        img_array = np.array(image)
        result = ocr.ocr(img_array, cls=True)
        
        if not result or not result[0]:
            logger.warning('未识别到文字')
            return jsonify({'ok': False, 'error': '未识别到文字，请确保图片清晰'}), 400
        
        # 解析结果
        parsed_result = parse_business_license(result)
        
        if not parsed_result:
            logger.warning('解析结果为空')
            return jsonify({'ok': False, 'error': '无法解析营业执照信息'}), 400
        
        logger.info('营业执照识别成功')
        return jsonify({'ok': True, 'data': parsed_result})
    
    except Exception as e:
        logger.error(f'营业执照识别失败: {str(e)}', exc_info=True)
        return jsonify({'ok': False, 'error': f'识别失败: {str(e)}'}), 500


if __name__ == '__main__':
    logger.info('=' * 60)
    logger.info('PaddleOCR 服务启动中...')
    logger.info('服务地址: http://0.0.0.0:5000')
    logger.info('健康检查: http://0.0.0.0:5000/health')
    logger.info('身份证识别: POST http://0.0.0.0:5000/ocr/idcard')
    logger.info('营业执照识别: POST http://0.0.0.0:5000/ocr/business-license')
    logger.info('=' * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)

