// 检查数据库中warehouse字段的脚本
import { MongoClient } from 'mongodb';

async function checkWarehouse() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('MongoDB连接成功');
    
    const db = client.db('high_altitude_rental');
    console.log('使用数据库: high_altitude_rental');
    
    // 列出所有集合
    const collections = await db.listCollections().toArray();
    console.log('数据库中的集合:', collections.map(c => c.name));
    
    const equipments = db.collection('equipments');
    
    // 检查集合中的文档数量
    const count = await equipments.countDocuments();
    console.log(`equipments集合中的文档数量: ${count}`);
    
    if (count === 0) {
      console.log('equipments集合为空，检查其他可能的集合名称...');
      
      // 尝试其他可能的集合名称
      const possibleNames = ['equipment', 'Equipment', 'Equipments'];
      for (const name of possibleNames) {
        const altCollection = db.collection(name);
        const altCount = await altCollection.countDocuments();
        console.log(`${name}集合中的文档数量: ${altCount}`);
        
        if (altCount > 0) {
          console.log(`找到数据在${name}集合中`);
          const samples = await altCollection.find({}).limit(3).toArray();
          console.log('样本数据:', JSON.stringify(samples, null, 2));
          break;
        }
      }
      return;
    }
    
    console.log('检查设备的warehouse字段值:');
    
    // 获取所有不同的warehouse值
    const warehouses = await equipments.distinct('warehouse');
    console.log('所有warehouse值:', warehouses);
    
    // 统计每个warehouse的设备数量
    const warehouseCounts = await equipments.aggregate([
      {
        $group: {
          _id: '$warehouse',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('每个warehouse的设备数量:');
    warehouseCounts.forEach(item => {
      console.log(`  "${item._id}": ${item.count}台设备`);
    });
    
    // 查看几个具体的设备记录
    const samples = await equipments.find({}).limit(5).toArray();
    console.log('\n前5台设备的完整信息:');
    samples.forEach((eq, index) => {
      console.log(`设备${index + 1}:`, JSON.stringify(eq, null, 2));
    });
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await client.close();
  }
}

checkWarehouse();