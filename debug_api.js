// 调试API返回数据的脚本
// 使用Node.js内置的fetch API

async function testAPI() {
  try {
    console.log('Testing API: http://localhost:3002/api/equipments/inventory/stats');
    
    const response = await fetch('http://localhost:3002/api/equipments/inventory/stats');
    const result = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response OK:', result.ok);
    console.log('API Response Data:');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.data && Array.isArray(result.data)) {
      console.log('\n数据分析:');
      console.log('总记录数:', result.data.length);
      
      const areas = result.data.map(item => item.area);
      console.log('所有区域:', [...new Set(areas)]);
      
      const defaultWarehouse = result.data.filter(item => item.area === '默认仓库');
      console.log('默认仓库记录数:', defaultWarehouse.length);
      
      const unspecifiedWarehouse = result.data.filter(item => item.area === '未指定仓库');
      console.log('未指定仓库记录数:', unspecifiedWarehouse.length);
    }
    
  } catch (error) {
    console.error('API测试失败:', error);
  }
}

testAPI();