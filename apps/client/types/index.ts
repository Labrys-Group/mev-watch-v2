export * from "./chakraTheme";
export * from "./relays";
export * from "./timeFrame";
export * from "./visualizationBlock";
export * from "./api";

declare global {
  interface Window {
    ethereum: any;
  }
}
