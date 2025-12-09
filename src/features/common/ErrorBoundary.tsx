import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 错误边界组件，用于捕获子组件树中的JavaScript错误，防止整个应用崩溃
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  /**
   * 静态方法，用于更新状态以显示降级UI
   * 在渲染阶段调用，不允许产生副作用
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新状态，以便下一次渲染显示降级UI
    return {
      hasError: true,
      error: error,
      errorInfo: null
    };
  }

  /**
   * 组件生命周期方法，在错误被捕获后调用
   * 可以执行副作用，如记录错误信息
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 可以在这里记录错误日志
    console.error('错误边界捕获到错误:', error, errorInfo);
    
    // 更新状态以包含错误信息
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // 提供自定义的降级UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 默认降级UI
      return (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <h3 style={{ color: '#ff4d4f', marginBottom: '16px' }}>发生错误</h3>
          <p style={{ color: '#666', marginBottom: '8px' }}>组件渲染过程中出现错误，请尝试刷新页面。</p>
          {false && (
            <details style={{ textAlign: 'left', marginTop: '16px' }}>
              <summary>错误详情</summary>
              <p style={{ color: '#ff4d4f' }}>{this.state.error?.toString()}</p>
              <pre style={{ fontSize: '12px', color: '#666', whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // 正常渲染子组件
    return this.props.children;
  }
}

export default ErrorBoundary;