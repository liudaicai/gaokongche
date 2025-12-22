/**
 * 会话管理工具
 * 功能：
 * 1. 15分钟无操作自动登出
 * 2. 关闭页面后需要重新登录（使用sessionStorage）
 */

// 会话超时时间：15分钟（毫秒）
const SESSION_TIMEOUT = 15 * 60 * 1000;

// 最后活动时间
let lastActivityTime: number = Date.now();

// 定时器ID
let timeoutCheckTimer: NodeJS.Timeout | null = null;

// 登出回调函数
let logoutCallback: (() => void) | null = null;

/**
 * 从sessionStorage获取认证token
 */
export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem('auth_token');
  } catch (error) {
    console.error('[SessionManager] 获取token失败:', error);
    return null;
  }
}

/**
 * 设置认证token到sessionStorage
 */
export function setAuthToken(token: string): void {
  try {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('login_time', Date.now().toString());
    // 更新最后活动时间
    lastActivityTime = Date.now();
  } catch (error) {
    console.error('[SessionManager] 设置token失败:', error);
  }
}

/**
 * 从sessionStorage获取用户信息
 */
export function getUserInfo(): any | null {
  try {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('[SessionManager] 获取用户信息失败:', error);
    return null;
  }
}

/**
 * 设置用户信息到sessionStorage
 */
export function setUserInfo(user: any): void {
  try {
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('isAuthenticated', 'true');
  } catch (error) {
    console.error('[SessionManager] 设置用户信息失败:', error);
  }
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  try {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('login_time');
    console.log('[SessionManager] 认证信息已清除');
  } catch (error) {
    console.error('[SessionManager] 清除认证信息失败:', error);
  }
}

/**
 * 检查会话是否有效
 */
export function isSessionValid(): boolean {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  // 检查是否超过15分钟无操作
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  
  if (timeSinceLastActivity > SESSION_TIMEOUT) {
    console.log('[SessionManager] 会话已过期（15分钟无操作）');
    return false;
  }

  return true;
}

/**
 * 更新最后活动时间
 */
function updateActivity(): void {
  lastActivityTime = Date.now();
}

/**
 * 检查会话超时
 */
function checkSessionTimeout(): void {
  if (!isSessionValid() && getAuthToken()) {
    console.log('[SessionManager] 会话超时，自动登出');
    clearAuth();
    
    if (logoutCallback) {
      logoutCallback();
    }
  }
}

/**
 * 监听用户活动事件
 */
const activityEvents = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
];

/**
 * 活动事件处理器
 */
const activityHandler = (): void => {
  updateActivity();
};

/**
 * 初始化会话管理
 * @param onLogout 登出回调函数
 */
export function initSessionManager(onLogout: () => void): void {
  logoutCallback = onLogout;
  
  // 绑定活动事件监听
  activityEvents.forEach(event => {
    window.addEventListener(event, activityHandler, { passive: true });
  });

  // 启动定时检查（每分钟检查一次）
  timeoutCheckTimer = setInterval(checkSessionTimeout, 60 * 1000);

  console.log('[SessionManager] 会话管理已初始化（15分钟无操作自动登出）');
}

/**
 * 销毁会话管理
 */
export function destroySessionManager(): void {
  // 移除活动事件监听
  activityEvents.forEach(event => {
    window.removeEventListener(event, activityHandler);
  });

  // 清除定时器
  if (timeoutCheckTimer) {
    clearInterval(timeoutCheckTimer);
    timeoutCheckTimer = null;
  }

  logoutCallback = null;
  
  console.log('[SessionManager] 会话管理已销毁');
}

/**
 * 获取剩余会话时间（毫秒）
 */
export function getRemainingTime(): number {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  const remaining = SESSION_TIMEOUT - timeSinceLastActivity;
  return Math.max(0, remaining);
}

/**
 * 获取剩余会话时间（格式化为分:秒）
 */
export function getRemainingTimeFormatted(): string {
  const remaining = getRemainingTime();
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
