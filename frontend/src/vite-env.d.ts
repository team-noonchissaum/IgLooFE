/// <reference types="vite/client" />

declare module "sockjs-client" {
  const SockJS: new (url: string) => unknown;
  export default SockJS;
}
