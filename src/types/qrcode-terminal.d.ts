declare module 'qrcode-terminal' {
  interface QRCodeOptions {
    small?: boolean;
  }
  
  function generate(
    text: string, 
    opts?: QRCodeOptions, 
    callback?: (qrcode: string) => void
  ): void;
  
  export { generate };
  export default { generate };
}
