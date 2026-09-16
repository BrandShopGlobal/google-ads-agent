export async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    const serverPage = body.trim().startsWith("<!DOCTYPE");
    throw new Error(
      serverPage
        ? `Server returned an HTML error page (${response.status}). This usually means the request timed out or crashed on Netlify.`
        : `Server returned ${contentType || "an unknown response type"} (${response.status}).`,
    );
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
