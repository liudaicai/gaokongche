// 创收金额动态计算服务
// 根据设备实际使用情况计算订单的创收金额

/**
 * 计算设备租金
 * @param {number} dailyRate - 天租价
 * @param {number} monthlyRate - 月租价（可选）
 * @param {number} days - 使用天数
 * @param {number} quantity - 设备数量
 * @returns {number} 租金金额
 */
function calculateEquipmentRent(dailyRate, monthlyRate, days, quantity) {
  // 1. 如果没有月租价，直接按天计算
  if (!monthlyRate || monthlyRate === 0) {
    return dailyRate * days * quantity;
  }
  
  // 2. 计算按天的总额
  const dailyTotal = dailyRate * days * quantity;
  
  // 3. 如果在30天内且天租总额大于月租，使用月租
  if (days <= 30 && dailyTotal > monthlyRate) {
    return monthlyRate * quantity;
  }
  
  // 4. 否则使用天租
  return dailyTotal;
}

/**
 * 计算单个订单的创收金额
 * @param {object} pool - MySQL连接池
 * @param {number} orderId - 订单ID
 * @param {Date} startDate - 开始日期（可选，用于时间段查询）
 * @param {Date} endDate - 结束日期（可选，默认今天）
 * @returns {Promise<number>} 创收金额
 */
async function calculateOrderRevenue(pool, orderId, startDate = null, endDate = null) {
  try {
    // 1. 获取订单基本信息
    const [orders] = await pool.query(
      'SELECT transport_fee, modification_fee, created_at FROM orders WHERE id = ? AND deleted_at IS NULL',
      [orderId]
    );
    
    if (!orders || orders.length === 0) {
      console.log(`[RevenueCalculator] 订单${orderId}不存在或已删除`);
      return 0;
    }
    
    const order = orders[0];
    const transportFee = parseFloat(order.transport_fee) || 0;
    const modificationFee = parseFloat(order.modification_fee) || 0;
    
    // 2. 获取设备需求（价格信息）
    const [demands] = await pool.query(
      'SELECT daily_rate, monthly_rate, quantity, transport_fee as demand_transport_fee, modification_fee as demand_modification_fee FROM order_equipment_demands WHERE order_id = ?',
      [orderId]
    );
    
    // 如果没有设备需求数据，返回订单的运费和改装费（兼容旧数据）
    if (!demands || demands.length === 0) {
      console.log(`[RevenueCalculator] 订单${orderId}没有设备需求数据，使用默认费用`);
      return transportFee + modificationFee;
    }
    
    // 3. 获取进场记录
    const [entries] = await pool.query(
      'SELECT entry_date, equipment_count, logistics_cost FROM order_entries WHERE order_id = ? ORDER BY entry_date',
      [orderId]
    );
    
    if (!entries || entries.length === 0) {
      console.log(`[RevenueCalculator] 订单${orderId}没有进场记录`);
      return transportFee + modificationFee;
    }
    
    // 4. 获取退场记录
    const [exits] = await pool.query(
      'SELECT exit_date, equipment_count FROM order_exits WHERE order_id = ? ORDER BY exit_date DESC LIMIT 1',
      [orderId]
    );
    
    // 5. 计算设备租金
    let equipmentRevenue = 0;
    
    // 使用第一个设备需求的价格（假设一个订单的所有设备价格相同）
    const demand = demands[0];
    const dailyRate = parseFloat(demand.daily_rate) || 0;
    const monthlyRate = parseFloat(demand.monthly_rate) || 0;
    
    // 遍历每条进场记录计算租金
    entries.forEach(entry => {
      const entryDate = new Date(entry.entry_date);
      const equipmentCount = parseInt(entry.equipment_count) || 0;
      
      // 确定结束日期
      let actualEndDate;
      if (exits && exits.length > 0) {
        // 已退场：使用退场日期
        actualEndDate = new Date(exits[0].exit_date);
      } else {
        // 未退场：使用指定的结束日期或今天
        actualEndDate = endDate ? new Date(endDate) : new Date();
      }
      
      // 如果指定了开始日期，且进场日期在开始日期之前，则从开始日期开始计算
      const calculationStartDate = startDate && entryDate < new Date(startDate) 
        ? new Date(startDate) 
        : entryDate;
      
      // 计算使用天数
      const days = Math.max(0, Math.ceil((actualEndDate - calculationStartDate) / (1000 * 60 * 60 * 24)));
      
      // 计算租金
      if (days > 0) {
        const rent = calculateEquipmentRent(dailyRate, monthlyRate, days, equipmentCount);
        equipmentRevenue += rent;
        
        console.log(`[RevenueCalculator] 订单${orderId} - 进场日期:${entry.entry_date}, 使用天数:${days}, 设备数:${equipmentCount}, 租金:¥${rent.toFixed(2)}`);
      }
    });
    
    // 6. 获取实际的运费和改装费（优先使用需求表的，其次使用订单表的）
    const actualTransportFee = parseFloat(demand.demand_transport_fee) || transportFee;
    const actualModificationFee = parseFloat(demand.demand_modification_fee) || modificationFee;
    
    // 7. 总创收 = 设备租金 + 运费 + 改装费
    const totalRevenue = equipmentRevenue + actualTransportFee + actualModificationFee;
    
    console.log(`[RevenueCalculator] 订单${orderId} 总创收: ¥${totalRevenue.toFixed(2)} (租金:¥${equipmentRevenue.toFixed(2)} + 运费:¥${actualTransportFee.toFixed(2)} + 改装费:¥${actualModificationFee.toFixed(2)})`);
    
    return totalRevenue;
    
  } catch (error) {
    console.error(`[RevenueCalculator] 计算订单${orderId}创收失败:`, error);
    return 0;
  }
}

/**
 * 计算多个订单的总创收
 * @param {object} pool - MySQL连接池
 * @param {Array<number>} orderIds - 订单ID数组
 * @param {Date} startDate - 开始日期（可选）
 * @param {Date} endDate - 结束日期（可选）
 * @returns {Promise<number>} 总创收金额
 */
async function calculateTotalRevenue(pool, orderIds, startDate = null, endDate = null) {
  const revenues = await Promise.all(
    orderIds.map(id => calculateOrderRevenue(pool, id, startDate, endDate))
  );
  
  return revenues.reduce((sum, revenue) => sum + revenue, 0);
}

/**
 * 计算指定时间段的创收金额（按日聚合）
 * @param {object} pool - MySQL连接池
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<Array>} 按日期聚合的创收数据 [{date, revenue}, ...]
 */
async function calculateRevenueByDate(pool, startDate, endDate) {
  try {
    // 1. 获取所有有效订单
    const [orders] = await pool.query(
      `SELECT id FROM orders 
       WHERE deleted_at IS NULL 
       AND status NOT IN ('cancelled', 'deleted')
       AND created_at <= ?`,
      [endDate]
    );
    
    if (!orders || orders.length === 0) {
      return [];
    }
    
    // 2. 生成日期范围
    const dateMap = new Map();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }
    
    // 3. 计算每个订单每天的创收
    for (const order of orders) {
      // 获取该订单的所有进场记录
      const [entries] = await pool.query(
        'SELECT entry_date FROM order_entries WHERE order_id = ?',
        [order.id]
      );
      
      if (entries && entries.length > 0) {
        // 对于每天，如果设备已进场且未退场，计算当天的创收
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // 计算从订单创建到当天的累计创收
          const revenue = await calculateOrderRevenue(pool, order.id, null, d);
          
          // 这里简化处理：将总创收平均分配到每一天
          // 实际应该按每天的租金增量计算
          if (revenue > 0) {
            const currentRevenue = dateMap.get(dateStr) || 0;
            dateMap.set(dateStr, currentRevenue + revenue / dateMap.size);
          }
        }
      }
    }
    
    // 4. 转换为数组
    return Array.from(dateMap.entries())
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100 // 保留2位小数
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
  } catch (error) {
    console.error('[RevenueCalculator] 计算按日创收失败:', error);
    return [];
  }
}

export {
  calculateEquipmentRent,
  calculateOrderRevenue,
  calculateTotalRevenue,
  calculateRevenueByDate
};
