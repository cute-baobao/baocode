type ErrorResponse = {
  json: () => Promise<unknown>;
  status: number;
  statusText: string;
};

export async function getErrorMessage(response: ErrorResponse) {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim() !== "") {
      return data.error;
    }
    return (
      response.statusText ||
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  } catch {
    // Ignore JSON parsing errors
    return (
      response.statusText ||
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  }
}
