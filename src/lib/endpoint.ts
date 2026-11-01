export const forwardToEndpoint = async (formData: Record<string, unknown>) => {
  const url = process.env.FORWARD_ENDPOINT;
  if (url === undefined || url === "") {
    return;
  }

  await fetch(url, {
    body: JSON.stringify(formData),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
};
