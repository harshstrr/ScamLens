import api from "./api-client";

export const sign_in_google = async (payload: {
  id_token: string
}) => {
  const response = await api.post("/auth/google" , payload);

  return response.data;
};
