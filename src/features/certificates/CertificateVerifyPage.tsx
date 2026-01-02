import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Result, Spin, Descriptions, Tag, Image } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { apiGet, API_BASE } from '../../api/client';
import dayjs from 'dayjs';

const CertificateVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [error, setError] = useState('');

  const certId = searchParams.get('id');
  const name = searchParams.get('name');
  const idCard = searchParams.get('idCard');

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!certId || certId === 'preview') {
        setError('这是预览二维码，无法验证');
        setLoading(false);
        return;
      }

      try {
        const response = await apiGet<any>(`/operator-certificates/verify/${certId}`);
        setVerifyResult(response);
      } catch (err: any) {
        setError(err?.message || '验证失败');
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [certId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ minWidth: 300, textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在验证证件...</div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: 20
      }}>
        <Card style={{ maxWidth: 600, width: '100%' }}>
          <Result
            status="error"
            title="验证失败"
            subTitle={error}
          />
        </Card>
      </div>
    );
  }

  const { valid, message: msg, data } = verifyResult || {};

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: 20
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card>
          <Result
            status={valid ? 'success' : 'warning'}
            icon={valid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            title={msg || (valid ? '证件有效' : '证件无效')}
            subTitle={valid ? '此高空作业车操作证真实有效' : '此证件可能已过期或被吊销'}
          />

          {data && (
            <>
              <Descriptions bordered column={2} style={{ marginTop: 24 }}>
                <Descriptions.Item label="姓名" span={2}>
                  <strong style={{ fontSize: 16 }}>{data.employeeName}</strong>
                </Descriptions.Item>
                
                <Descriptions.Item label="身份证号" span={2}>
                  {data.idCardNumber}
                </Descriptions.Item>
                
                <Descriptions.Item label="操作机型" span={2}>
                  <Tag color="blue">{data.equipmentType}</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="培训日期">
                  {data.trainingDate ? dayjs(data.trainingDate).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
                
                <Descriptions.Item label="有效期至">
                  <span style={{ color: valid ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
                    {data.expireDate ? dayjs(data.expireDate).format('YYYY-MM-DD') : '-'}
                  </span>
                </Descriptions.Item>
                
                {data.trainerName && (
                  <Descriptions.Item label="培训师">
                    {data.trainerName}
                  </Descriptions.Item>
                )}
                
                {data.companyName && (
                  <Descriptions.Item label="培训机构">
                    {data.companyName}
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="状态" span={2}>
                  <Tag color={
                    data.status === 'valid' ? 'success' : 
                    data.status === 'expired' ? 'error' : 
                    'default'
                  }>
                    {data.status === 'valid' ? '有效' : 
                     data.status === 'expired' ? '已过期' : 
                     data.status === 'revoked' ? '已吊销' : 
                     '未知'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              {data.photoUrl && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, color: '#666' }}>持证人照片</div>
                  <Image
                    src={data.photoUrl}
                    width={200}
                    style={{ border: '1px solid #d9d9d9' }}
                    alt="持证人照片"
                  />
                </div>
              )}
            </>
          )}

          <div style={{ 
            marginTop: 32, 
            padding: 16, 
            background: '#f5f5f5', 
            borderRadius: 4,
            fontSize: 12,
            color: '#666'
          }}>
            <div>* 本验证结果由系统自动生成</div>
            <div>* 如有疑问，请联系发证机构核实</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CertificateVerifyPage;
