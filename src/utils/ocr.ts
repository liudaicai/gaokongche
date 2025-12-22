import { apiPost } from '../api/client';

/**
 * OCR 识别结果类型
 */
export interface IDCardOCRResult {
  name?: string;
  idNumber?: string;
  address?: string;
  gender?: string;
  nationality?: string;
  birth?: string;
}

export interface BusinessLicenseOCRResult {
  companyName?: string;
  creditCode?: string;
  address?: string;
  legalPerson?: string;
  registerDate?: string;
  businessScope?: string;
}

/**
 * 识别身份证图片
 * @param file 图片文件或 base64
 * @param onProgress 进度回调
 * @returns 识别结果
 */
export const recognizeIDCard = async (
  file: File | string,
  onProgress?: (status: 'loading' | 'success' | 'error', message: string) => void
): Promise<IDCardOCRResult | null> => {
  try {
    onProgress?.('loading', '正在识别身份证信息...');
    
    let base64Image: string;
    
    if (typeof file === 'string') {
      base64Image = file;
    } else {
      base64Image = await fileToBase64(file);
    }

    // 调用后端 OCR API
    const result = await apiPost<IDCardOCRResult>('/ocr/idcard', {
      image: base64Image,
    });

    console.log('OCR API 返回结果:', result);
    
    // apiPost已经解包了data，直接使用result
    if (result && (result.name || result.idNumber)) {
      console.log('识别到的数据:', result);
      onProgress?.('success', '身份证识别成功！');
      return result;
    }
    
    console.warn('OCR返回数据为空或格式错误');
    return null;
  } catch (error: any) {
    console.error('身份证识别失败:', error);
    onProgress?.('error', error.message || '身份证识别失败，请手动输入');
    return null;
  }
};

/**
 * 识别营业执照图片
 * @param file 图片文件或 base64
 * @param onProgress 进度回调
 * @returns 识别结果
 */
export const recognizeBusinessLicense = async (
  file: File | string,
  onProgress?: (status: 'loading' | 'success' | 'error', message: string) => void
): Promise<BusinessLicenseOCRResult | null> => {
  try {
    onProgress?.('loading', '正在识别营业执照信息...');
    
    let base64Image: string;
    
    if (typeof file === 'string') {
      base64Image = file;
    } else {
      base64Image = await fileToBase64(file);
    }

    // 调用后端 OCR API
    const result = await apiPost<BusinessLicenseOCRResult>('/ocr/business-license', {
      image: base64Image,
    });

    // apiPost已经解包了data，直接使用result
    if (result && (result.companyName || result.creditCode)) {
      onProgress?.('success', '营业执照识别成功！');
      return result;
    }
    
    return null;
  } catch (error: any) {
    console.error('营业执照识别失败:', error);
    onProgress?.('error', error.message || '营业执照识别失败，请手动输入');
    return null;
  }
};

/**
 * 将文件转换为 Base64
 * @param file 文件对象
 * @returns Base64 字符串
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * 智能判断图片类型并识别
 * @param file 图片文件
 * @param expectedType 期望的类型 'idcard' | 'business-license'
 * @returns 识别结果
 */
export const smartRecognize = async (
  file: File,
  expectedType?: 'idcard' | 'business-license'
): Promise<{ type: 'idcard' | 'business-license'; data: any } | null> => {
  try {
    // 如果指定了期望类型，直接识别
    if (expectedType === 'idcard') {
      const data = await recognizeIDCard(file);
      return data ? { type: 'idcard', data } : null;
    } else if (expectedType === 'business-license') {
      const data = await recognizeBusinessLicense(file);
      return data ? { type: 'business-license', data } : null;
    }

    // 否则，先尝试识别身份证，失败则尝试营业执照
    const idCardResult = await recognizeIDCard(file);
    if (idCardResult && idCardResult.idNumber) {
      return { type: 'idcard', data: idCardResult };
    }

    const licenseResult = await recognizeBusinessLicense(file);
    if (licenseResult && licenseResult.companyName) {
      return { type: 'business-license', data: licenseResult };
    }

    message.warning('未能识别图片类型，请确认上传的是身份证或营业执照');
    return null;
  } catch (error) {
    console.error('智能识别失败:', error);
    return null;
  }
};

