declare module 'mammoth/mammoth.browser' {
  interface ConvertResult {
    value: string;
    messages: any[];
  }

  interface ConvertOptions {
    arrayBuffer: ArrayBuffer;
  }

  export function convertToHtml(options: ConvertOptions): Promise<ConvertResult>;
}