// Endpoint diagnostik SEMENTARA: buka https://<domain>/api/delcom-health di browser untuk melihat
// apakah server hosting bisa menjangkau API Delcom, dan jika gagal, apa penyebabnya.
// Hapus file ini setelah masalah proxy selesai.
export default defineEventHandler(async () => {
  const base = process.env.VITE_DELCOM_BASEURL || "https://open-api.delcom.org/api/v1";
  const result: Record<string, unknown> = {
    node: process.version,
    baseUrl: base,
    envVarSet: Boolean(process.env.VITE_DELCOM_BASEURL),
    proxyEnvSet: Boolean(
      process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy
    ),
  };

  try {
    const response = await fetch(`${base}/users`, { signal: AbortSignal.timeout(8000) });
    result.reachable = true;
    result.upstreamStatus = response.status;
  } catch (error) {
    const err = error as Error & { cause?: { code?: string; message?: string } };
    result.reachable = false;
    result.error = {
      name: err.name,
      message: err.message,
      causeCode: err.cause?.code,
      causeMessage: err.cause?.message,
    };
  }

  return result;
});
