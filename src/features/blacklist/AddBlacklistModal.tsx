/**
 * 添加黑名单记录模态框
 */
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, Button, Alert, App } from 'antd';
import { ScanOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { addBlacklistRecord, updateBlacklistRecord } from './blacklistSlice';
import type { BlacklistRecord } from './types';
import { recognizeIDCard, type IDCardOCRResult } from '../../utils/ocr';

const { TextArea } = Input;
const { Option } = Select;

interface AddBlacklistModalProps {
  visible: boolean;
  onClose: () => void;
  record?: BlacklistRecord | null;
  onSuccess?: () => void;
}

const AddBlacklistModal: React.FC<AddBlacklistModalProps> = ({
  visible,
  onClose,
  record,
  onSuccess,
}) => {
  const { message: messageApi, modal } = App.useApp();
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const isEdit = !!record;

  // 当模态框打开或记录变化时，重置表单
  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue({
          customerName: record.customerName,
          customerPhone: record.customerPhone,
          customerIdCard: record.customerIdCard,
          reason: record.reason,
          severity: record.severity,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, record, form]);

  // OCR 识别 - 身份证
  const handleIDCardOCR = async (file: File) => {
    setOcrProcessing(true);
    
    const handleProgress = (status: 'loading' | 'success' | 'error', msg: string) => {
      if (status === 'loading') {
        messageApi.loading({ content: msg, key: 'ocr', duration: 0 });
      } else if (status === 'success') {
        messageApi.success({ content: msg, key: 'ocr', duration: 2 });
      } else {
        messageApi.error({ content: msg, key: 'ocr', duration: 3 });
      }
    };
    
    try {
      const result = await recognizeIDCard(file, handleProgress);
      console.log('handleIDCardOCR 收到结果:', result);
      
      if (result) {
        // 显示确认对话框
        modal.confirm({
          title: '识别成功',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          width: 500,
          content: (
            <div>
              <p>已识别到以下信息，是否自动填充？</p>
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {result.name && <div><strong>姓名：</strong>{result.name}</div>}
                {result.idNumber && <div><strong>身份证号：</strong>{result.idNumber}</div>}
                {result.gender && <div><strong>性别：</strong>{result.gender}</div>}
                {result.birth && <div><strong>出生日期：</strong>{result.birth}</div>}
                {result.address && <div><strong>地址：</strong>{result.address}</div>}
              </div>
            </div>
          ),
          onOk: () => {
            // 填充表单
            form.setFieldsValue({
              customerName: result.name || '',
              customerIdCard: result.idNumber || '',
            });
            
            messageApi.success('已自动填充表单');
          },
          onCancel: () => {
            console.log('用户取消自动填充');
          },
        });
      } else {
        console.warn('OCR返回结果为空');
        messageApi.warning('识别结果为空，请重试或手动输入');
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      messageApi.error('身份证识别失败，请手动输入');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit && record) {
        // 编辑模式（仅超管可用）
        await dispatch(updateBlacklistRecord({ 
          id: record.id, 
          data: values 
        })).unwrap();
        messageApi.success('黑名单记录更新成功');
      } else {
        // 添加模式
        await dispatch(addBlacklistRecord(values)).unwrap();
        messageApi.success('黑名单记录添加成功');
      }

      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('黑名单操作失败:', error);
      
      // 处理查重错误
      if (error?.message && error.message.includes('已在黑名单中')) {
        // 显示详细的查重错误信息
        modal.error({
          title: '❌ 添加失败',
          width: 500,
          content: (
            <div>
              <Alert
                message="该客户已在黑名单中"
                description={error.message}
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
              />
              <div style={{ padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                  <strong>提示：</strong>
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 13, color: '#666' }}>
                  <li>请检查输入的客户信息是否正确</li>
                  <li>如需修改现有记录，请联系超级管理员</li>
                  <li>可在黑名单列表中搜索查看现有记录</li>
                </ul>
              </div>
            </div>
          ),
        });
      } else {
        messageApi.error(error?.message || `${isEdit ? '更新' : '添加'}黑名单记录失败`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? '编辑黑名单记录' : '添加黑名单记录'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="提交"
      cancelText="取消"
    >
      {/* OCR 识别提示 */}
      {!isEdit && (
        <Alert
          message="快速录入"
          description={
            <div>
              <p style={{ margin: '4px 0' }}>支持身份证识别，点击下方按钮快速填充客户信息</p>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleIDCardOCR(file);
                  return false;
                }}
              >
                <Button 
                  icon={<ScanOutlined />} 
                  type="primary" 
                  ghost 
                  loading={ocrProcessing}
                  size="small"
                  style={{ marginTop: 8 }}
                >
                  拍照识别身份证
                </Button>
              </Upload>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {ocrProcessing && (
        <Alert
          message="正在识别中..."
          description="请稍候，正在使用AI识别证件信息"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="customerName"
          label="客户名称"
          rules={[{ required: true, message: '请输入客户名称' }]}
        >
          <Input placeholder="请输入客户名称（或使用身份证识别自动填充）" maxLength={255} />
        </Form.Item>

        <Form.Item
          name="customerPhone"
          label="客户电话"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
          ]}
        >
          <Input placeholder="请输入客户电话" maxLength={50} />
        </Form.Item>

        <Form.Item
          name="customerIdCard"
          label="身份证号"
          rules={[
            { 
              pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, 
              message: '请输入正确的身份证号码' 
            }
          ]}
        >
          <Input placeholder="请输入身份证号（或使用身份证识别自动填充）" maxLength={50} />
        </Form.Item>

        <Form.Item
          name="severity"
          label="严重程度"
          rules={[{ required: true, message: '请选择严重程度' }]}
          initialValue="medium"
        >
          <Select placeholder="请选择严重程度">
            <Option value="low">低风险</Option>
            <Option value="medium">中风险</Option>
            <Option value="high">高风险</Option>
            <Option value="critical">极高风险</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="reason"
          label="加入原因"
          rules={[
            { required: true, message: '请输入加入黑名单的原因' },
            { min: 10, message: '原因描述至少10个字符' }
          ]}
        >
          <TextArea
            placeholder="请详细描述加入黑名单的原因，包括具体事件、时间、影响等信息"
            rows={6}
            maxLength={2000}
            showCount
          />
        </Form.Item>
      </Form>

      <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
          <strong>提示：</strong>
        </p>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: '#666' }}>
          <li>黑名单记录将被所有租户共享查看</li>
          <li>请确保填写的信息真实准确</li>
          <li>建议保留相关证据材料</li>
          {!isEdit && (
            <>
              <li>系统会自动检查身份证号和客户名称，防止重复添加</li>
              <li>提交后立即生效，无需等待审核</li>
            </>
          )}
        </ul>
      </div>
    </Modal>
  );
};

export default AddBlacklistModal;

