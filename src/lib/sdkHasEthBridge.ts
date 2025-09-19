export function sdkHasEthBridge(sdk: any) {
  const a = sdk?.actions ?? {};
  return typeof a.ethProviderRequestV2 === "function" || typeof a.ethProviderRequest === "function";
}
