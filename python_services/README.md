# PaddleOCR 服务

基于 PaddleOCR 的身份证和营业执照识别服务。

## 特点

- ✅ **完全免费**，无需注册任何账号
- ✅ **高准确率**（90-95%），接近商业 OCR 服务
- ✅ **本地部署**，数据安全可控
- ✅ **支持中文**，专为中文证件优化
- ✅ **快速响应**，平均识别时间 1-3 秒

## 系统要求

- Python 3.8+
- 2GB+ 内存
- 无需 GPU（CPU 版本即可）

## 安装步骤

### 1. 安装 Python 依赖

```bash
cd python_services
pip install -r requirements.txt
```

**注意**：首次安装会下载 PaddleOCR 模型文件（约 10MB），请耐心等待。

### 2. 启动服务

```bash
python ocr_service.py
```

启动成功后，您会看到：

```
============================================================
PaddleOCR 服务启动中...
服务地址: http://0.0.0.0:5000
健康检查: http://0.0.0.0:5000/health
身份证识别: POST http://0.0.0.0:5000/ocr/idcard
营业执照识别: POST http://0.0.0.0:5000/ocr/business-license
============================================================
 * Running on http://0.0.0.0:5000
```

### 3. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```env
# PaddleOCR 服务地址
PADDLE_OCR_URL=http://localhost:5000
```

### 4. 重启 Node.js 后端

```bash
npm run api
```

## API 接口

### 健康检查

```http
GET http://localhost:5000/health
```

**响应：**
```json
{
  "ok": true,
  "service": "PaddleOCR",
  "status": "running"
}
```

### 身份证识别

```http
POST http://localhost:5000/ocr/idcard
Content-Type: application/json

{
  "image": "base64_encoded_image_string"
}
```

**响应：**
```json
{
  "ok": true,
  "data": {
    "name": "张三",
    "idNumber": "110101199001011234",
    "address": "北京市东城区某某街道某某号",
    "gender": "男",
    "nationality": "汉",
    "birth": "1990-01-01"
  }
}
```

### 营业执照识别

```http
POST http://localhost:5000/ocr/business-license
Content-Type: application/json

{
  "image": "base64_encoded_image_string"
}
```

**响应：**
```json
{
  "ok": true,
  "data": {
    "companyName": "北京某某科技有限公司",
    "creditCode": "91110000MA01234567",
    "address": "北京市朝阳区某某路某某号",
    "legalPerson": "李四",
    "registerDate": "2020-01-01"
  }
}
```

## 测试

### 使用 curl 测试

```bash
# 测试健康检查
curl http://localhost:5000/health

# 测试身份证识别（需要准备 base64 编码的图片）
curl -X POST http://localhost:5000/ocr/idcard \
  -H "Content-Type: application/json" \
  -d '{"image": "your_base64_image_string"}'
```

### 使用 Python 测试

```python
import requests
import base64

# 读取图片并转换为 base64
with open('idcard.jpg', 'rb') as f:
    image_base64 = base64.b64encode(f.read()).decode('utf-8')

# 发送请求
response = requests.post(
    'http://localhost:5000/ocr/idcard',
    json={'image': image_base64}
)

print(response.json())
```

## 性能优化

### 1. 使用 Gunicorn（生产环境）

```bash
pip install gunicorn

# 启动 4 个工作进程
gunicorn -w 4 -b 0.0.0.0:5000 ocr_service:app
```

### 2. 使用 Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ocr_service.py .

EXPOSE 5000

CMD ["python", "ocr_service.py"]
```

构建并运行：

```bash
docker build -t paddle-ocr-service .
docker run -d -p 5000:5000 paddle-ocr-service
```

### 3. 添加缓存

对相同图片的识别结果进行缓存，减少重复计算：

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def cached_ocr(image_hash):
    # OCR 识别逻辑
    pass
```

## 常见问题

### Q1: 安装 PaddlePaddle 失败？

**A:** 尝试使用清华镜像源：

```bash
pip install paddlepaddle -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q2: 识别速度慢？

**A:** 
- 确保图片分辨率不要过高（建议 1920x1080 以内）
- 使用 Gunicorn 启动多个工作进程
- 考虑使用 GPU 版本（需要 CUDA 环境）

### Q3: 识别准确率不高？

**A:**
- 确保图片清晰、光线充足
- 证件完整在画面内
- 避免反光和阴影
- 可以对图片进行预处理（增强对比度、去噪等）

### Q4: 如何在 Windows 上运行？

**A:** 
```bash
# 1. 安装 Python 3.8+
# 2. 打开 PowerShell 或 CMD
cd python_services
pip install -r requirements.txt
python ocr_service.py
```

### Q5: 服务崩溃或内存不足？

**A:**
- 检查系统内存是否充足（建议 2GB+）
- 使用 Gunicorn 限制工作进程数量
- 添加请求频率限制

## 监控和日志

### 查看日志

服务会输出详细的日志信息：

```
2025-06-01 10:30:15 - __main__ - INFO - 接收到身份证图片，尺寸: (1920, 1080)
2025-06-01 10:30:16 - __main__ - INFO - 开始识别身份证...
2025-06-01 10:30:17 - __main__ - INFO - 身份证识别文本: 姓名 张三 性别 男 ...
2025-06-01 10:30:17 - __main__ - INFO - 身份证解析结果: {'name': '张三', ...}
2025-06-01 10:30:17 - __main__ - INFO - 身份证识别成功
```

### 添加监控

可以使用 Prometheus + Grafana 监控服务状态：

```python
from prometheus_client import Counter, Histogram

ocr_requests = Counter('ocr_requests_total', 'Total OCR requests')
ocr_duration = Histogram('ocr_duration_seconds', 'OCR processing duration')
```

## 进阶功能

### 支持更多证件类型

可以扩展支持：
- 驾驶证
- 行驶证
- 护照
- 银行卡

只需添加对应的解析函数即可。

### 批量识别

```python
@app.route('/ocr/batch', methods=['POST'])
def batch_recognize():
    images = request.json.get('images', [])
    results = []
    for img in images:
        result = ocr.ocr(img, cls=True)
        results.append(parse_idcard(result))
    return jsonify({'ok': True, 'data': results})
```

## 更新日志

- **v1.0.0** (2025-06-01)
  - ✅ 初始版本
  - ✅ 支持身份证识别
  - ✅ 支持营业执照识别
  - ✅ 完整的错误处理和日志

## 技术支持

如有问题，请查看：
- [PaddleOCR 官方文档](https://github.com/PaddlePaddle/PaddleOCR)
- [Flask 官方文档](https://flask.palletsprojects.com/)
- 项目 Issues

---

**祝您使用愉快！** 🎉

