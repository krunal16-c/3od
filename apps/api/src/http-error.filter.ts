import { Catch, type ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class JsonErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const customException = exception as { statusCode?: unknown; code?: unknown; message?: unknown };
    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : typeof customException.statusCode === 'number'
        ? customException.statusCode
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof response === 'string'
      ? response
      : typeof customException.message === 'string' && customException.message
        ? customException.message
        : 'Unexpected server error';
    const code = typeof customException.code === 'string'
      ? customException.code
      : statusCode >= 500
        ? 'INTERNAL_ERROR'
        : 'REQUEST_ERROR';

    reply.status(statusCode).send({
      statusCode,
      code,
      message,
      requestId: request.id,
    });
  }
}
