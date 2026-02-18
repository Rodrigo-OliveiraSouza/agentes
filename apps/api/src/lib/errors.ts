export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const toErrorResponse = (error: unknown): Response => {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      }),
      {
        status: error.status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  }

  console.error('Unhandled error:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno inesperado.',
      },
    }),
    {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    },
  );
};

