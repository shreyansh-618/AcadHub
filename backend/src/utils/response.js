export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    code: 'SUCCESS',
    message,
    data,
  });
};

export const sendError = (res, code, message, errors, statusCode = 400) => {
  res.status(statusCode).json({
    code,
    message,
    ...(errors && { errors }),
  });
};

export const sendPaginatedSuccess = (
  res,
  data,
  total,
  page,
  limit,
  message = 'Success'
) => {
  res.status(200).json({
    code: 'SUCCESS',
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
};
