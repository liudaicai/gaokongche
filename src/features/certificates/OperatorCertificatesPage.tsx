import React, { useEffect, useState, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Select, message, Space,
  Card, Statistic, Row, Col, Tag, Upload, Dropdown, Divider
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined, UploadOutlined,
  DownloadOutlined, MoreOutlined, EyeOutlined, FilePdfOutlined
} from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import { apiGet, apiPost, apiPut, apiDelete, API_BASE } from '../../api/client';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

const { Option } = Select;

const OperatorCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: '', equipmentType: '', status: '', companyId: '' });

  // 下拉数据
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // 印章相关
  const [seals, setSeals] = useState<any[]>([]);
  const [selectedSealId, setSelectedSealId] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  
  // 到期时间（用于显示自动计算的结果）
  const [expireDate, setExpireDate] = useState<string>('');
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 加载证书列表
  const loadCertificates = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });
      console.log('[操作证] 请求参数:', Object.fromEntries(params));
      const response = await apiGet<any>(`/operator-certificates?${params}`);
      console.log('[操作证] 响应数据:', response);
      setCertificates(response.data || []);
      setPagination({
        current: page,
        pageSize,
        total: response.pagination?.total || 0
      });
    } catch (err: any) {
      console.error('[操作证] 加载失败:', err);
      message.error(err?.message || '加载证书列表失败');
      // 即使失败也要设置空数据，避免一直loading
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await apiGet<any>('/operator-certificates/stats');
      console.log('[操作证] 统计数据:', response);
      setStats(response);
    } catch (err: any) {
      console.error('[操作证] 加载统计失败:', err);
      // 设置默认统计数据，避免undefined
      setStats({ total: 0, validCount: 0, expiringSoonCount: 0, expiredCount: 0 });
    }
  };

  // 加载下拉数据
  const loadOptions = async () => {
    try {
      console.log('[操作证] 开始加载下拉选项...');
      const [typesRes, trainersRes, companiesRes] = await Promise.all([
        apiGet<any>('/operator-certificates/equipment-types').catch(err => {
          console.error('[操作证] 加载设备类型失败:', err);
          return { data: [] };
        }),
        apiGet<any>('/operator-certificates/trainers').catch(err => {
          console.error('[操作证] 加载培训人失败:', err);
          return { data: [] };
        }),
        apiGet<any>('/operator-certificates/companies').catch(err => {
          console.error('[操作证] 加载公司失败:', err);
          return { data: [] };
        })
      ]);
      console.log('[操作证] 设备类型原始响应:', typesRes);
      console.log('[操作证] 培训人原始响应:', trainersRes);
      console.log('[操作证] 公司原始响应:', companiesRes);
      
      // 从响应中提取 data 字段
      const types = typesRes?.data || typesRes || [];
      const trainers = trainersRes?.data || trainersRes || [];
      const companies = companiesRes?.data || companiesRes || [];
      
      console.log('[操作证] 设备类型数据:', types);
      console.log('[操作证] 培训人数据:', trainers);
      console.log('[操作证] 公司数据:', companies);
      
      setEquipmentTypes(types);
      setTrainers(trainers);
      setCompanies(companies);
    } catch (err: any) {
      console.error('[操作证] 加载选项失败:', err);
      // 设置空数组避免undefined
      setEquipmentTypes([]);
      setTrainers([]);
      setCompanies([]);
    }
  };

  // 加载印章列表
  const loadSeals = async () => {
    try {
      const response = await apiGet<any>('/seals?pageSize=100&isActive=true');
      setSeals(response.data || []);
    } catch (err: any) {
      console.error('[操作证] 加载印章失败:', err);
    }
  };

  // 生成证件样式的电子操作证预览
  const generatePreview = () => {
    if (!photoUrl) {
      message.warning('请先上传头像照片');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取表单数据
    const formData = form.getFieldsValue();
    const employeeName = formData.employeeName || '姓名';
    const idCardNumber = formData.idCardNumber || '身份证号码';
    const equipmentType = formData.equipmentType || '操作机型';
    const trainerName = trainers.find(t => t.id === formData.trainerId)?.name || '培训师';
    
    // 处理日期
    let trainingDateObj = formData.trainingDate;
    if (!trainingDateObj) {
      trainingDateObj = dayjs();
    } else if (!dayjs.isDayjs(trainingDateObj)) {
      trainingDateObj = dayjs(trainingDateObj);
    }
    const trainingDate = trainingDateObj.format('YYYY-MM-DD');
    const validityPeriod = formData.validityPeriod || 24;
    const expireDateStr = trainingDateObj.add(validityPeriod, 'month').format('YYYY-MM-DD');
    const companyName = companies.find(c => c.id === formData.companyId)?.name || '培训公司';

    // 设置证件尺寸 (单页布局)
    const certWidth = 800;
    const certHeight = 1100; // 增加高度以容纳操作须知
    canvas.width = certWidth;
    canvas.height = certHeight;
    
    console.log('[证件预览] Canvas尺寸:', { width: certWidth, height: certHeight, pages: 1 });

    // 1. 绘制正面背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, certWidth, certHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, certWidth - 40, certHeight - 40);

    // 2. 绘制主标题（居中）
    ctx.fillStyle = '#333';
    ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('高空作业车操作证', certWidth / 2, 90);

    // 加载并绘制照片
    const photo = new Image();
    photo.crossOrigin = 'anonymous';
    photo.src = photoUrl;

    photo.onload = () => {
      // 4. 绘制照片区 (左侧)
      const photoWidth = 240;
      const photoHeight = 320;
      const photoX = 60;
      const photoY = 160;
      
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
      
      const scale = Math.min(photoWidth / photo.width, photoHeight / photo.height);
      const scaledWidth = photo.width * scale;
      const scaledHeight = photo.height * scale;
      const offsetX = (photoWidth - scaledWidth) / 2;
      const offsetY = (photoHeight - scaledHeight) / 2;
      ctx.drawImage(photo, photoX + offsetX, photoY + offsetY, scaledWidth, scaledHeight);
      
      // 照片边框
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);

      // 5. 绘制核心信息区 (右侧)
      const infoX = 340;
      let infoY = 200;
      const lineHeight = 62;
      const labelWidth = 140;

      const fields = [
        { label: '姓    名', value: employeeName },
        { label: '身份证号', value: idCardNumber },
        { label: '操作机型', value: equipmentType },
        { label: '培 训 师', value: trainerName },
        { label: '培训时间', value: trainingDate },
        { label: '有效日期', value: expireDateStr },
      ];

      fields.forEach((field) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#666';
        ctx.font = '26px "Microsoft YaHei", sans-serif';
        ctx.fillText(field.label, infoX, infoY);
        
        // 绘制下划线
        ctx.beginPath();
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        ctx.moveTo(infoX + labelWidth, infoY + 8);
        ctx.lineTo(certWidth - 60, infoY + 8);
        ctx.stroke();

        // 绘制内容（身份证号用小号字体确保完整显示）
        ctx.fillStyle = '#000';
        if (field.label === '身份证号') {
          ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        } else {
          ctx.font = 'bold 26px "Microsoft YaHei", sans-serif';
        }
        ctx.fillText(field.value, infoX + labelWidth + 10, infoY);

        infoY += lineHeight;
      });

      // 6. 绘制分隔红线
      ctx.fillStyle = '#e60012';
      ctx.fillRect(20, 520, certWidth - 40, 6);

      // 7. 底部公司信息（居中）
      ctx.textAlign = 'center';
      ctx.fillStyle = '#333';
      ctx.font = 'bold 28px "Microsoft YaHei"';
      ctx.fillText(companyName, certWidth / 2, 560);

      // 8. 操作须知区域（在公司名称下方，紧凑布局）
      ctx.fillStyle = '#333';
      ctx.font = 'bold 22px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('操作须知', certWidth / 2, 610);
      
      // 操作须知内容（左侧，压缩字体和行距）
      ctx.textAlign = 'left';
      ctx.fillStyle = '#333';
      ctx.font = '14px "Microsoft YaHei"';
      
      const notices = [
        '一、操作人员必须经过专业培训并取得本证后方可上岗操作。',
        '二、操作前必须检查设备状态，确保各项安全装置完好有效。',
        '三、严格遵守安全操作规程，禁止违章作业和冒险蛮干。',
        '四、作业时必须佩戴安全帽、安全带等个人防护装备。',
        '五、设备出现异常情况应立即停止作业并报告管理人员。',
        '六、禁止酒后操作、疲劳操作和带病操作设备。',
        '七、作业期间严禁闲杂人员进入作业区域。',
        '八、定期参加复训和安全教育，保持操作技能。',
        '九、本证应妥善保管，不得涂改、转借或伪造。',
        '十、本证到期前应及时办理复审或换证手续。'
      ];
      
      let noticeY = 645;
      const lineSpacing = 32;
      
      notices.forEach((notice) => {
        ctx.fillText(notice, 60, noticeY);
        noticeY += lineSpacing;
      });
      
      // 9. 构建验证URL并生成二维码
      const verifyUrl = `${window.location.origin}/verify-certificate?id=${editingId || 'preview'}&name=${encodeURIComponent(employeeName)}&idCard=${encodeURIComponent(idCardNumber)}`;
      
      QRCode.toDataURL(verifyUrl, {
        width: 110,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then((qrDataUrl) => {
        // 绘制二维码（右侧，底部与第十条平齐）
        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        qrImage.onload = () => {
          const qrSize = 110;
          const qrX = certWidth - 180;
          // 计算：第十条的Y坐标 = 645 + 9*32 = 933
          // 二维码底部对齐，所以顶部 = 933 - 110 = 823
          const qrY = 823;
          
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          
          // 二维码下方提示
          ctx.fillStyle = '#666';
          ctx.font = '12px "Microsoft YaHei"';
          ctx.textAlign = 'center';
          ctx.fillText('扫码验证真伪', qrX + qrSize/2, qrY + qrSize + 20);
          
          // 底部说明
          ctx.fillStyle = '#999';
          ctx.font = '12px "Microsoft YaHei"';
          ctx.textAlign = 'center';
          ctx.fillText('请妥善保管本证，如有遗失请及时补办', certWidth / 2, 1060);
          
          // 二维码绘制完成后，再绘制印章
          if (selectedSealId) {
            const selectedSeal = seals.find(s => s.id === selectedSealId);
            if (selectedSeal) {
              const seal = new Image();
              seal.crossOrigin = 'anonymous';
              seal.src = selectedSeal.image_url.startsWith('/uploads') 
                ? selectedSeal.image_url 
                : `${API_BASE}${selectedSeal.image_url}`;

              seal.onload = () => {
                // 印章位置：在照片和信息区域之间
                const sealSize = 180; 
                const sealCenterX = 310;
                const sealCenterY = 340;

                ctx.save();
                ctx.translate(sealCenterX, sealCenterY);
                ctx.rotate(-0.08);
                ctx.globalAlpha = 0.85; 
                ctx.drawImage(seal, -sealSize/2, -sealSize/2, sealSize, sealSize);
                ctx.restore();

                setPreviewImage(canvas.toDataURL('image/png'));
                setPreviewVisible(true);
              };
              seal.onerror = () => {
                setPreviewImage(canvas.toDataURL('image/png'));
                setPreviewVisible(true);
              };
            } else {
              setPreviewImage(canvas.toDataURL('image/png'));
              setPreviewVisible(true);
            }
          } else {
            setPreviewImage(canvas.toDataURL('image/png'));
            setPreviewVisible(true);
          }
        };
      })
      .catch((err) => {
        console.error('[证件预览] 二维码生成失败:', err);
        message.error('二维码生成失败');
      });
    };

    photo.onerror = () => {
      message.error('照片加载失败');
    };
  };

  // 批量下载PDF（A4纸张，2x2布局）
  const handleBatchDownloadPDF = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一张操作证');
      return;
    }

    message.loading({ content: '正在生成PDF，请稍候...', key: 'pdf', duration: 0 });

    try {
      // 获取选中的证书数据
      const selectedCerts = certificates.filter((cert: any) => 
        selectedRowKeys.includes(cert.id)
      );

      // A4尺寸（mm）：210 x 297
      // jsPDF默认单位是mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4宽度
      const pageHeight = 297; // A4高度
      const margin = 5; // 边距
      const certWidth = (pageWidth - margin * 3) / 2; // 每个证书宽度
      const certHeight = (pageHeight - margin * 3) / 2; // 每个证书高度

      // 处理每张证书
      for (let i = 0; i < selectedCerts.length; i++) {
        const cert: any = selectedCerts[i];
        
        // 生成证书图片
        const imageData = await generateCertificateImage(cert);
        
        if (!imageData) continue;

        // 计算在A4上的位置（2x2布局）
        const positionIndex = i % 4; // 0,1,2,3 对应左上、右上、左下、右下
        const row = Math.floor(positionIndex / 2); // 0或1
        const col = positionIndex % 2; // 0或1
        
        const x = margin + col * (certWidth + margin);
        const y = margin + row * (certHeight + margin);

        // 添加图片到PDF
        pdf.addImage(imageData, 'PNG', x, y, certWidth, certHeight);

        // 每4张证书换一页（除了最后一页）
        if ((i + 1) % 4 === 0 && i < selectedCerts.length - 1) {
          pdf.addPage();
        }
      }

      // 下载PDF
      pdf.save(`操作证批量下载_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
      message.success({ content: 'PDF生成成功', key: 'pdf' });
      
      // 清空选择
      setSelectedRowKeys([]);
    } catch (err: any) {
      console.error('[批量下载] 生成PDF失败:', err);
      message.error({ content: err?.message || 'PDF生成失败', key: 'pdf' });
    }
  };

  // 生成单个证书图片
  const generateCertificateImage = async (cert: any): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // 设置证件尺寸
      const certWidth = 800;
      const certHeight = 1100;
      canvas.width = certWidth;
      canvas.height = certHeight;

      // 绘制背景
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, certWidth, certHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, 20, certWidth - 40, certHeight - 40);

      // 绘制标题
      ctx.fillStyle = '#333';
      ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('高空作业车操作证', certWidth / 2, 90);

      // 加载照片
      const photo = new Image();
      photo.crossOrigin = 'anonymous';
      photo.src = cert.photo_url || '';

      photo.onload = () => {
        // 绘制照片
        const photoWidth = 240;
        const photoHeight = 320;
        const photoX = 60;
        const photoY = 160;
        
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
        
        const scale = Math.min(photoWidth / photo.width, photoHeight / photo.height);
        const scaledWidth = photo.width * scale;
        const scaledHeight = photo.height * scale;
        const offsetX = (photoWidth - scaledWidth) / 2;
        const offsetY = (photoHeight - scaledHeight) / 2;
        ctx.drawImage(photo, photoX + offsetX, photoY + offsetY, scaledWidth, scaledHeight);
        
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);

        // 绘制信息
        const infoX = 340;
        let infoY = 200;
        const lineHeight = 62;
        const labelWidth = 140;

        const fields = [
          { label: '姓    名', value: cert.employee_name },
          { label: '身份证号', value: cert.id_card_number },
          { label: '操作机型', value: cert.equipment_type },
          { label: '培 训 师', value: cert.trainer_name || '培训师' },
          { label: '培训时间', value: cert.training_date ? dayjs(cert.training_date).format('YYYY-MM-DD') : '-' },
          { label: '有效日期', value: cert.expire_date ? dayjs(cert.expire_date).format('YYYY-MM-DD') : '-' },
        ];

        fields.forEach((field) => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#666';
          ctx.font = '26px "Microsoft YaHei", sans-serif';
          ctx.fillText(field.label, infoX, infoY);
          
          ctx.beginPath();
          ctx.strokeStyle = '#bbb';
          ctx.lineWidth = 1;
          ctx.moveTo(infoX + labelWidth, infoY + 8);
          ctx.lineTo(certWidth - 60, infoY + 8);
          ctx.stroke();

          ctx.fillStyle = '#000';
          if (field.label === '身份证号') {
            ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
          } else {
            ctx.font = 'bold 26px "Microsoft YaHei", sans-serif';
          }
          ctx.fillText(field.value, infoX + labelWidth + 10, infoY);

          infoY += lineHeight;
        });

        // 绘制分隔红线
        ctx.fillStyle = '#e60012';
        ctx.fillRect(20, 520, certWidth - 40, 6);

        // 底部公司信息
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';
        ctx.font = 'bold 28px "Microsoft YaHei"';
        ctx.fillText(cert.company_name || '培训公司', certWidth / 2, 560);

        // 操作须知标题
        ctx.fillStyle = '#333';
        ctx.font = 'bold 22px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText('操作须知', certWidth / 2, 610);
        
        // 操作须知内容
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333';
        ctx.font = '14px "Microsoft YaHei"';
        
        const notices = [
          '一、操作人员必须经过专业培训并取得本证后方可上岗操作。',
          '二、操作前必须检查设备状态，确保各项安全装置完好有效。',
          '三、严格遵守安全操作规程，禁止违章作业和冒险蛮干。',
          '四、作业时必须佩戴安全帽、安全带等个人防护装备。',
          '五、设备出现异常情况应立即停止作业并报告管理人员。',
          '六、禁止酒后操作、疲劳操作和带病操作设备。',
          '七、作业期间严禁闲杂人员进入作业区域。',
          '八、定期参加复训和安全教育，保持操作技能。',
          '九、本证应妥善保管，不得涂改、转借或伪造。',
          '十、本证到期前应及时办理复审或换证手续。'
        ];
        
        let noticeY = 645;
        const lineSpacing = 32;
        
        notices.forEach((notice) => {
          ctx.fillText(notice, 60, noticeY);
          noticeY += lineSpacing;
        });
        
        // 生成二维码
        const verifyUrl = `${window.location.origin}/verify-certificate?id=${cert.id}&name=${encodeURIComponent(cert.employee_name)}&idCard=${encodeURIComponent(cert.id_card_number)}`;
        
        QRCode.toDataURL(verifyUrl, {
          width: 110,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        }).then((qrDataUrl) => {
          const qrImage = new Image();
          qrImage.src = qrDataUrl;
          qrImage.onload = () => {
            const qrSize = 110;
            const qrX = certWidth - 180;
            const qrY = 823;
            
            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
            
            ctx.fillStyle = '#666';
            ctx.font = '12px "Microsoft YaHei"';
            ctx.textAlign = 'center';
            ctx.fillText('扫码验证真伪', qrX + qrSize/2, qrY + qrSize + 20);
            
            ctx.fillStyle = '#999';
            ctx.font = '12px "Microsoft YaHei"';
            ctx.fillText('请妥善保管本证，如有遗失请及时补办', certWidth / 2, 1060);
            
            // 绘制印章（如果有）
            if (cert.seal_id) {
              // 从seals列表中获取印章
              const sealData = seals.find((s: any) => s.id === cert.seal_id);
              if (sealData && sealData.image_url) {
                const seal = new Image();
                seal.crossOrigin = 'anonymous';
                seal.src = sealData.image_url.startsWith('/uploads') 
                  ? sealData.image_url 
                  : `${API_BASE}${sealData.image_url}`;
                
                seal.onload = () => {
                  const sealSize = 180;
                  const sealCenterX = 310;
                  const sealCenterY = 340;
                  
                  ctx.save();
                  ctx.translate(sealCenterX, sealCenterY);
                  ctx.rotate(-0.08);
                  ctx.globalAlpha = 0.85;
                  ctx.drawImage(seal, -sealSize/2, -sealSize/2, sealSize, sealSize);
                  ctx.restore();
                  
                  resolve(canvas.toDataURL('image/png'));
                };
                
                seal.onerror = () => {
                  resolve(canvas.toDataURL('image/png'));
                };
              } else {
                resolve(canvas.toDataURL('image/png'));
              }
            } else {
              resolve(canvas.toDataURL('image/png'));
            }
          };
        }).catch(() => {
          resolve(canvas.toDataURL('image/png'));
        });
      };

      photo.onerror = () => {
        // 即使照片加载失败，也返回证书图片
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  useEffect(() => {
    loadCertificates(1, 10);
    loadStats();
    loadOptions();
    loadSeals();
  }, []);

  // 打开新增/编辑模态框
  const showModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      setPhotoUrl(record.photo_url || '');
      form.setFieldsValue({
        ...record,
        trainingDate: record.training_date ? dayjs(record.training_date) : dayjs(),
      });
      // 计算并设置到期时间
      if (record.training_date && record.validity_period) {
        const expire = dayjs(record.training_date).add(record.validity_period, 'month').format('YYYY-MM-DD');
        setExpireDate(expire);
      }
    } else {
      setEditingId(null);
      setPhotoUrl('');
      form.resetFields();
      form.setFieldsValue({
        trainingDate: dayjs(),
        validityPeriod: 12,
        status: 'valid'
      });
      // 默认到期时间（当天 + 12个月）
      const defaultExpire = dayjs().add(12, 'month').format('YYYY-MM-DD');
      setExpireDate(defaultExpire);
    }
    // 重置印章选择
    setSelectedSealId(null);
    setModalVisible(true);
  };

  // 计算到期时间
  const calculateExpireDate = () => {
    const trainingDate = form.getFieldValue('trainingDate');
    const validityPeriod = form.getFieldValue('validityPeriod');
    if (trainingDate && validityPeriod) {
      const expireDate = dayjs(trainingDate).add(validityPeriod, 'month');
      return expireDate.format('YYYY-MM-DD');
    }
    return '';
  };

  // 处理表单值变化（自动计算到期时间）
  const handleFormChange = (changedValues: any, allValues: any) => {
    // 当培训时间或有效期变化时，重新计算到期时间
    if (changedValues.trainingDate || changedValues.validityPeriod) {
      const trainingDate = form.getFieldValue('trainingDate');
      const validityPeriod = form.getFieldValue('validityPeriod');
      
      if (trainingDate && validityPeriod) {
        const newExpireDate = dayjs(trainingDate).add(validityPeriod, 'month').format('YYYY-MM-DD');
        console.log('[操作证] 到期时间自动计算:', newExpireDate);
        setExpireDate(newExpireDate); // 更新状态，触发重新渲染
      } else {
        setExpireDate('');
      }
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        trainingDate: values.trainingDate?.format('YYYY-MM-DD'),
        photoUrl: photoUrl,
        // 查找选中的培训人和培训公司名称
        trainerName: trainers.find(t => t.id === values.trainerId)?.name || null,
        companyName: companies.find(c => c.id === values.companyId)?.name || null,
      };

      if (editingId) {
        await apiPut(`/operator-certificates/${editingId}`, payload);
        message.success('更新成功');
      } else {
        const result = await apiPost<any>('/operator-certificates', payload);
        message.success('证书创建成功');
        // 自动生成证书
        if (result?.id) {
          try {
            await apiPost(`/operator-certificates/${result.id}/generate`, {});
            message.success('证书已自动生成');
          } catch (err: any) {
            message.warning('证书生成失败：' + (err?.message || '未知错误'));
          }
        }
      }

      setModalVisible(false);
      loadCertificates(pagination.current, pagination.pageSize);
      loadStats();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  // 删除证书
  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/operator-certificates/${id}`);
      message.success('删除成功');
      loadCertificates(pagination.current, pagination.pageSize);
      loadStats();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  // 下载证书
  const handleDownload = (record: any) => {
    if (record.certificate_url) {
      window.open(record.certificate_url, '_blank');
    } else {
      message.warning('证书未生成，请先生成证书');
    }
  };

  // 操作菜单
  const getActionMenu = (record: any) => ({
    items: [
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: '下载证书',
        onClick: () => handleDownload(record)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '修改',
        onClick: () => showModal(record)
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: '确定删除此证书？',
            icon: <ExclamationCircleOutlined />,
            content: '删除后将无法恢复',
            okText: '确定',
            cancelText: '取消',
            onOk: () => handleDelete(record.id)
          });
        }
      }
    ]
  });

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 100,
    },
    {
      title: '身份证号码',
      dataIndex: 'id_card_number',
      key: 'id_card_number',
      width: 160,
    },
    {
      title: '操作机型',
      dataIndex: 'equipment_type',
      key: 'equipment_type',
      width: 120,
    },
    {
      title: '培训时间',
      dataIndex: 'training_date',
      key: 'training_date',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '培训人',
      dataIndex: 'trainer_name',
      key: 'trainer_name',
      width: 100,
    },
    {
      title: '到期时间',
      dataIndex: 'expire_date',
      key: 'expire_date',
      width: 110,
      render: (date: string, record: any) => {
        const expireDate = dayjs(date);
        const daysLeft = record.daysUntilExpiry;
        let color = 'green';
        if (daysLeft < 0) color = 'red';
        else if (daysLeft <= 30) color = 'orange';

        return (
          <Tag color={color}>
            {expireDate.format('YYYY-MM-DD')}
            {daysLeft >= 0 && daysLeft <= 30 && ` (${daysLeft}天)`}
          </Tag>
        );
      },
    },
    {
      title: '培训公司',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Dropdown menu={getActionMenu(record)} trigger={['click']}>
          <Button type="link" icon={<MoreOutlined />}>
            操作
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>
        <SafetyCertificateOutlined /> 操作证管理
      </h1>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="证书总数" value={stats.total || 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="有效证书" value={stats.validCount || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="即将过期"
              value={stats.expiringSoonCount || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已过期" value={stats.expiredCount || 0} valueStyle={{ color: '#999' }} />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            新增操作证
          </Button>
          <Input
            placeholder="搜索姓名、身份证号"
            style={{ width: 200 }}
            onPressEnter={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setFilters({ ...filters, search: value });
              loadCertificates(1, pagination.pageSize);
            }}
            allowClear
          />
          <Select
            placeholder="筛选操作机型"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, equipmentType: value || '' });
              loadCertificates(1, pagination.pageSize);
            }}
          >
            {equipmentTypes.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
          <Select
            placeholder="筛选培训公司"
            style={{ width: 180 }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
            }
            onChange={(value) => {
              setFilters({ ...filters, companyId: value || '' });
              loadCertificates(1, pagination.pageSize);
            }}
          >
            {companies.map(company => (
              <Option key={company.id} value={company.id}>{company.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, status: value || '' });
              loadCertificates(1, pagination.pageSize);
            }}
          >
            <Option value="valid">有效</Option>
            <Option value="expired">已过期</Option>
            <Option value="revoked">已吊销</Option>
          </Select>
        </Space>
      </Card>

      {/* 证书列表 */}
      <Card>
        {/* 批量操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleBatchDownloadPDF}
              disabled={selectedRowKeys.length === 0}
            >
              批量下载PDF（已选 {selectedRowKeys.length} 张）
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button onClick={() => setSelectedRowKeys([])}>
                清空选择
              </Button>
            )}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={certificates}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys) => {
              setSelectedRowKeys(selectedKeys);
            },
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
              Table.SELECTION_NONE,
            ],
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(newPagination) => {
            loadCertificates(newPagination.current || 1, newPagination.pageSize || 10);
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '修改操作证' : '新增操作证'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employeeName"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idCardNumber" label="身份证号码">
                <Input placeholder="请输入身份证号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="equipmentType"
                label="操作机型"
                rules={[{ required: true, message: '请选择操作机型' }]}
              >
                <Select 
                  placeholder="请选择操作机型"
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {equipmentTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trainerId" label="培训人">
                <Select placeholder="请选择培训人" allowClear>
                  {trainers.map(trainer => (
                    <Option key={trainer.id} value={trainer.id}>{trainer.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="trainingDate"
                label="培训时间"
                rules={[{ required: true, message: '请选择培训时间' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validityPeriod"
                label="有效期"
                rules={[{ required: true, message: '请选择有效期' }]}
              >
                <Select placeholder="请选择有效期">
                  <Option value={1}>一个月</Option>
                  <Option value={3}>三个月</Option>
                  <Option value={6}>半年</Option>
                  <Option value={12}>一年</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="到期时间">
                <Input 
                  value={expireDate} 
                  disabled 
                  placeholder="自动计算" 
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    color: expireDate ? '#1890ff' : '#999',
                    fontWeight: expireDate ? 'bold' : 'normal'
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="companyId" label="培训公司">
                <Select 
                  placeholder="请选择培训公司" 
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {companies.map(company => (
                    <Option key={company.id} value={company.id}>{company.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="头像">
            <ImgCrop
              rotationSlider
              aspectSlider
              showGrid
              quality={1}
              modalTitle="裁剪照片"
              modalOk="确定"
              modalCancel="取消"
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                accept="image/*"
                action={`${API_BASE}/upload`}
                showUploadList={true}
                onChange={(info) => {
                  if (info.file.status === 'done') {
                    const url = info.file.response?.file?.url || '';
                    setPhotoUrl(url);
                    message.success('上传成功');
                  } else if (info.file.status === 'error') {
                    message.error('上传失败');
                  }
                }}
                onRemove={() => {
                  setPhotoUrl('');
                  return true;
                }}
              >
                {!photoUrl && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传照片</div>
                  </div>
                )}
              </Upload>
            </ImgCrop>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>

          <Divider orientation="left">印章与预览</Divider>

          <Form.Item label="选择印章">
            <Select
              placeholder="请选择印章（可选）"
              allowClear
              value={selectedSealId}
              onChange={setSelectedSealId}
              style={{ width: '100%' }}
            >
              {seals.map(seal => (
                <Option key={seal.id} value={seal.id}>
                  <Space>
                    <div style={{ 
                      width: 24, 
                      height: 24, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%), linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 5px 5px',
                      borderRadius: 2
                    }}>
                      <img 
                        src={seal.image_url.startsWith('/uploads') ? seal.image_url : `${API_BASE}${seal.image_url}`} 
                        alt={seal.name} 
                        style={{ width: 20, height: 20, objectFit: 'contain' }}
                      />
                    </div>
                    {seal.name}
                  </Space>
                </Option>
              ))}
            </Select>
            <div style={{ color: '#999', marginTop: 4, fontSize: 12 }}>
              选择印章后将自动印在操作证培训机构名称上
            </div>
          </Form.Item>

          <Form.Item>
            <Button 
              type="default" 
              icon={<EyeOutlined />} 
              onClick={generatePreview}
              disabled={!photoUrl}
              block
            >
              预览操作证
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title="操作证预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => {
              const link = document.createElement('a');
              link.href = previewImage;
              link.download = `操作证预览_${dayjs().format('YYYYMMDDHHmmss')}.png`;
              link.click();
            }}
          >
            下载
          </Button>
        ]}
        width={850}
      >
        <div style={{ textAlign: 'center', maxHeight: '75vh', overflowY: 'auto' }}>
          {previewImage && (
            <div>
              <img 
                src={previewImage} 
                alt="操作证预览" 
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4, color: '#0050b3', fontSize: '14px', fontWeight: 500 }}>
                📄 提示：操作证为 <strong style={{ color: '#d32f2f', fontSize: '16px' }}>单页</strong>紧凑布局（总高度1100px）<br/>
                • 上部：照片、个人信息、印章、公司名称<br/>
                • 下部：操作须知（左侧，14px小字体）+ 验证二维码（右下角）
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 隐藏的 Canvas 用于生成预览 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default OperatorCertificatesPage;
