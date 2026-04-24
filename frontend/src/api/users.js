import client from "./client";

export const updateUser = (data) => client.patch("/users/me", data);
export const deleteUser = () => client.delete("/users/me");
