export default defineEventHandler(() => {
  return {
    success: true,
    message: "Hệ thống hoạt động bình thường!",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  };
});
