// 简易模板引擎：支持 {{path}} 与 {{#each list}}...{{/each}} 语法

type AnyObj = Record<string, any>;

const getByPath = (obj: AnyObj, path: string) => {
  if (!path) return '';
  return path.split('.').reduce((acc: any, key) => {
    if (acc == null) return '';
    return acc[key];
  }, obj);
};

// 渲染循环：{{#each list}}...{{/each}}
const renderEach = (tpl: string, data: AnyObj) => {
  const eachRegex = /{{#each\s+([\w\.]+)\s*}}([\s\S]*?){{\/each}}/g;
  return tpl.replace(eachRegex, (_m, listPath, inner) => {
    const list = getByPath(data, listPath);
    if (!Array.isArray(list) || list.length === 0) return '';
    return list
      .map((item: any, idx: number) => {
        const scoped = { ...data, ...item, index: idx + 1 };
        return renderVariables(inner, scoped);
      })
      .join('');
  });
};

// 渲染变量：{{ a.b }} 支持基本值与数字格式化（currency）
const renderVariables = (tpl: string, data: AnyObj) => {
  return tpl.replace(/{{\s*([\w\.]+)(?:\|([\w]+))?\s*}}/g, (_m, path, filter) => {
    let val = getByPath(data, path);
    if (val == null) return '';
    if (filter === 'currency') {
      const num = Number(val) || 0;
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(val);
  });
};

export const renderTemplate = (template: string, data: AnyObj): string => {
  // 先处理循环，再处理普通占位符
  const step1 = renderEach(template, data);
  return renderVariables(step1, data);
};

// 统一打印/导出PDF工具
export const printElement = (element: HTMLElement) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write('<html><head><title>打印</title></head><body>');
  win.document.write(element.outerHTML);
  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  win.print();
  win.close();
};

export const exportElementAsPdf = async (element: HTMLElement, filename: string = 'document.pdf') => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(element as HTMLElement, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'pt', 'a4');
  // 计算缩放以适配A4宽度
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = canvas.height * (imgWidth / canvas.width);
  let position = 0;
  let heightLeft = imgHeight;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
};