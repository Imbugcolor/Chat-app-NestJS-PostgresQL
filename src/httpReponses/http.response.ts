import { HttpStatus } from '@nestjs/common';

export class HttpResponse {
  constructor(private detailString: string = 'Success.') {}

  success() {
    return {
      message: this.detailString,
      statusCode: HttpStatus.OK,
    };
  }

  notFound() {
    return {
      message: this.detailString,
      statusCode: HttpStatus.NOT_FOUND,
    };
  }
}
