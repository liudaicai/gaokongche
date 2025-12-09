// 测试聚合管道的脚本
import { MongoClient } from 'mongodb';

async function testPipeline() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('high_altitude_rental');
    const equipments = db.collection('equipments');
    
    console.log('测试聚合管道的每个步骤:');
    
    // 步骤1：添加area字段
    console.log('\n步骤1: 添加area字段');
    const step1 = await equipments.aggregate([
      {
        $addFields: {
          area: {
            $cond: [
              { $and: [{ $ne: ['$warehouse', null] }, { $ne: ['$warehouse', ''] }] },
              '$warehouse',
              '未指定仓库'
            ]
          }
        }
      },
      { $limit: 3 }
    ]).toArray();
    
    step1.forEach((doc, i) => {
      console.log(`  文档${i + 1}: warehouse="${doc.warehouse}", area="${doc.area}"`);
    });
    
    // 步骤2：过滤
    console.log('\n步骤2: 过滤掉默认仓库和未指定仓库');
    const step2 = await equipments.aggregate([
      {
        $addFields: {
          area: {
            $cond: [
              { $and: [{ $ne: ['$warehouse', null] }, { $ne: ['$warehouse', ''] }] },
              '$warehouse',
              '未指定仓库'
            ]
          }
        }
      },
      {
        $match: {
          area: { $nin: ['默认仓库', '未指定仓库'] }
        }
      }
    ]).toArray();
    
    console.log(`  过滤后的文档数量: ${step2.length}`);
    
    // 完整的聚合管道
    console.log('\n完整聚合管道结果:');
    const fullPipeline = await equipments.aggregate([
      // 第一步：添加区域字段（直接使用仓库名称）
      {
        $addFields: {
          area: {
            $cond: [
              { $and: [{ $ne: ['$warehouse', null] }, { $ne: ['$warehouse', ''] }] },
              '$warehouse',
              '未指定仓库'
            ]
          }
        }
      },
      // 第二步：过滤掉默认仓库和未指定仓库
      {
        $match: {
          area: { $nin: ['默认仓库', '未指定仓库'] }
        }
      },
      // 第三步：按type-height-area分组统计
      {
        $group: {
          _id: {
            type: '$type',
            height: '$height',
            area: '$area'
          },
          waitingCount: {
            $sum: {
              $cond: [{ $eq: ['$rentalStatus', 'waiting'] }, 1, 0]
            }
          },
          rentingCount: {
            $sum: {
              $cond: [{ $eq: ['$rentalStatus', 'renting'] }, 1, 0]
            }
          },
          repairingCount: {
            $sum: {
              $cond: [{ $eq: ['$rentalStatus', 'repairing'] }, 1, 0]
            }
          },
          totalCount: { $sum: 1 }
        }
      },
      // 第四步：格式化输出
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          height: '$_id.height',
          area: '$_id.area',
          waitingCount: 1,
          rentingCount: 1,
          repairingCount: 1,
          totalCount: 1
        }
      },
      // 第五步：排序
      {
        $sort: {
          type: 1,
          height: 1,
          area: 1
        }
      }
    ]).toArray();
    
    console.log(`最终结果数量: ${fullPipeline.length}`);
    console.log('最终结果:', JSON.stringify(fullPipeline, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await client.close();
  }
}

testPipeline();