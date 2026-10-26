// Production build (Vercel): `ng build --configuration production`.
//
// PLACEHOLDER: the RunPod pod does not exist yet. Replace <pod-id> with the real pod ID
// (https://<pod-id>-8000.proxy.runpod.net) and set useMock to false to use the backend.
// Keep it an https:// URL: browsers block an HTTPS page from calling an http:// address.
export const environment = {
  apiBaseUrl: 'https://<pod-id>-8000.proxy.runpod.net',
  useMock: false,
};
