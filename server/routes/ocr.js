import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// PaddleOCR 服务地址（从环境变量读取，默认为本地）
const PADDLE_OCR_URL = process.env.PADDLE_OCR_URL || 'http://localhost:5000';

/**
 * 身份证识别 - 使用 PaddleOCR
 */
router.post('/idcard', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ ok: false, error: '缺少图片数据' });
    }

    console.log('[OCR] 调用 PaddleOCR 识别身份证...');
    
    // 调用 PaddleOCR 服务
    const response = await axios.post(
      `${PADDLE_OCR_URL}/ocr/idcard`,
      { image },
      {
        timeout: 30000, // 30秒超时
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.ok) {
      console.log('[OCR] 身份证识别成功:', response.data.data);
      res.json(response.data);
    } else {
      console.error('[OCR] PaddleOCR 返回错误:', response.data.error);
      res.status(400).json(response.data);
    }
  } catch (error) {
    console.error('[OCR] 身份证识别失败:', error.message);
    
    // 检查是否是连接错误
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        ok: false,
        error: 'OCR服务未启动，请先启动 PaddleOCR 服务（python python_services/ocr_service.py）'
      });
    }
    
    res.status(500).json({
      ok: false,
      error: error.response?.data?.error || 'OCR识别服务暂时不可用，请手动输入'
    });
  }
});

/**
 * 营业执照识别 - 使用 PaddleOCR
 */
router.post('/business-license', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ ok: false, error: '缺少图片数据' });
    }

    console.log('[OCR] 调用 PaddleOCR 识别营业执照...');
    
    // 调用 PaddleOCR 服务
    const response = await axios.post(
      `${PADDLE_OCR_URL}/ocr/business-license`,
      { image },
      {
        timeout: 30000, // 30秒超时
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.ok) {
      console.log('[OCR] 营业执照识别成功:', response.data.data);
      res.json(response.data);
    } else {
      console.error('[OCR] PaddleOCR 返回错误:', response.data.error);
      res.status(400).json(response.data);
    }
  } catch (error) {
    console.error('[OCR] 营业执照识别失败:', error.message);
    
    // 检查是否是连接错误
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        ok: false,
        error: 'OCR服务未启动，请先启动 PaddleOCR 服务（python python_services/ocr_service.py）'
      });
    }
    
    res.status(500).json({
      ok: false,
      error: error.response?.data?.error || 'OCR识别服务暂时不可用，请手动输入'
    });
  }
});

/**
 * 健康检查 - 检查 PaddleOCR 服务是否可用
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${PADDLE_OCR_URL}/health`, {
      timeout: 5000
    });
    
    res.json({
      ok: true,
      paddleOCR: response.data
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: 'PaddleOCR 服务不可用',
      message: error.message
    });
  }
});

export default router;

