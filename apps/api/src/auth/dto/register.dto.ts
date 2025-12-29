import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = new Set([
  // System/admin related
  'admin',
  'administrator',
  'root',
  'system',
  'sysadmin',
  'superuser',
  'sudo',
  // Platform related
  'noj',
  'noj_admin',
  'nojadmin',
  'official',
  'staff',
  'support',
  'help',
  'moderator',
  'mod',
  // Technical
  'api',
  'www',
  'mail',
  'ftp',
  'smtp',
  'localhost',
  'null',
  'undefined',
  'none',
  'anonymous',
  // Common reserved
  'user',
  'guest',
  'test',
  'testing',
  'demo',
  'example',
  'info',
  'contact',
  'webmaster',
  'postmaster',
  'hostmaster',
  'abuse',
  'security',
  'noreply',
  'no_reply',
  'no.reply',
]);

function IsNotReservedUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotReservedUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return !RESERVED_USERNAMES.has(value.toLowerCase());
        },
        defaultMessage() {
          return 'This username is reserved and cannot be used';
        },
      },
    });
  };
}

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(
    /^(?!\.)(?!.*\.\.)(?=.*[a-z0-9])[a-z0-9._]+(?<!\.)$/,
    {
      message:
        'Username can only contain lowercase letters, numbers, periods, and underscores. ' +
        'Periods cannot be at the start/end or consecutive. Must contain at least one letter or number.',
    },
  )
  @IsNotReservedUsername()
  username!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
