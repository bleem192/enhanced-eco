const successResponse = (res, data, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = '操作失败', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.message || error;
  }
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, list, total, page, limit, message = '查询成功') => {
  return res.json({
    success: true,
    message,
    data: {
      list,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
