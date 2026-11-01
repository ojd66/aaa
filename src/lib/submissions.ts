import { createRedisState } from "@chat-adapter/state-redis";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const state = createRedisState();

const ensureConnected = state.connect();

export const getSubmission = async (id: string) => {
  await ensureConnected;
  return state.get<Record<string, unknown>>(`submission:${id}`);
};

export const setSubmission = async (
  id: string,
  data: Record<string, unknown>
) => {
  await ensureConnected;
  return state.set(`submission:${id}`, data, TTL_MS);
};

export const deleteSubmission = async (id: string) => {
  await ensureConnected;
  return state.delete(`submission:${id}`);
};
