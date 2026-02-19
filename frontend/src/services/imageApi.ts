import { api, unwrapData } from "@/lib/api";

export const imageApi = {
  uploadSingle: (file: File, type: "profile" | "item" | "etc") => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<{ message: string; data: string }>("/api/images", formData, {
        params: { type },
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrapData);
  },

  uploadMultiple: (files: File[], type: "item" | "profile") => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return api
      .post<{ message: string; data: string[] }>("/api/images/multiple", formData, {
        params: { type },
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrapData);
  },

  deleteImage: (url: string) =>
    api.delete<{ message: string; data: null }>("/api/images", {
      params: { url },
    }),
};
