import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { TSchema } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Value } from '@sinclair/typebox/value';

@Injectable()
export class TypeboxValidationPipe<T extends TSchema> implements PipeTransform {
  private readonly check: ReturnType<typeof TypeCompiler.Compile>;

  constructor(private readonly schema: T) {
    this.check = TypeCompiler.Compile(schema);
  }

  transform(value: unknown) {
    // Convert/coerce types (e.g., string "123" to number 123)
    const converted = Value.Convert(this.schema, value);

    if (!this.check.Check(converted)) {
      const errors = [...this.check.Errors(converted)];
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }

    return converted;
  }
}
