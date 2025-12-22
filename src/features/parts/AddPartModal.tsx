import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, App, Row, Col } from 'antd';
import { useAppDispatch } from '../../app/hooks';
import { addPart, fetchNextPartCode, fetchParts } from './partsSlice';
import type { AddPartFormData, PartCategory } from './types';

const { TextArea } = Input;
const { Option } = Select;

interface AddPartModalProps {
  open: boolean;
  onClose: () => void;
}

const PART_CATEGORIES: PartCategory[] = ['电控系统', '液压系统', '结构件', '易损件'];

const AddPartModal: React.FC<AddPartModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [nextCode, setNextCode] = useState('');

  // 获取下一个配件编号
  useEffect(() => {
    if (open) {
      dispatch(fetchNextPartCode())
        .unwrap()
        .then((code) => {
          setNextCode(code);
          form.setFieldsValue({ code });
        })
        .catch((err) => {
          messageApi.error('获取配件编号失败');
        });
    }
  }, [open, dispatch, form, messageApi]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData: AddPartFormData = {
        code: values.code,
        category: values.category,
        name: values.name,
        brand: values.brand,
        model: values.model,
        purchasePrice: values.purchasePrice,
        applicableRange: values.applicableRange,
        remark: values.remark,
      };

      await dispatch(addPart(formData)).unwrap();
      messageApi.success('新增配件成功');
      await dispatch(fetchParts());
      form.resetFields();
      onClose();
    } catch (error: any) {
      if (error.message) {
        messageApi.error(error.message);
      } else {
        messageApi.error('新增配件失败');
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
      title="新增配件"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ code: nextCode }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="配件编号"
              name="code"
              rules={[{ required: true, message: '请输入配件编号' }]}
            >
              <Input placeholder="系统自动生成" disabled style={{ backgroundColor: '#f5f5f5' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="配件类别"
              name="category"
              rules={[{ required: true, message: '请选择配件类别' }]}
            >
              <Select placeholder="请选择配件类别">
                {PART_CATEGORIES.map((category) => (
                  <Option key={category} value={category}>
                    {category}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="配件名称"
          name="name"
          rules={[{ required: true, message: '请输入配件名称' }, { max: 100, message: '配件名称最多100个字符' }]}
        >
          <Input placeholder="例如：控制器、电磁阀、油封、接触器等" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="品牌" name="brand" rules={[{ max: 100, message: '品牌最多100个字符' }]}>
              <Input placeholder="请输入品牌" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="规格型号" name="model" rules={[{ max: 100, message: '规格型号最多100个字符' }]}>
              <Input placeholder="请输入规格型号" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="采购价格"
          name="purchasePrice"
          rules={[
            { required: false },
            { type: 'number', min: 0, message: '采购价格不能为负数' },
          ]}
        >
          <InputNumber
            placeholder="请输入采购价格"
            style={{ width: '100%' }}
            precision={2}
            min={0}
            addonAfter="元"
          />
        </Form.Item>

        <Form.Item label="适用范围" name="applicableRange" rules={[{ max: 500, message: '适用范围最多500个字符' }]}>
          <Input placeholder="请输入适用范围" />
        </Form.Item>

        <Form.Item label="备注" name="remark" rules={[{ max: 2000, message: '备注最多2000个字符' }]}>
          <TextArea rows={4} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPartModal;
