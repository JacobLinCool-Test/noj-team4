import { IsString, MinLength } from 'class-validator';

export class CreateInvitationsDto {
  @IsString()
  @MinLength(1)
  emails!: string;
}

export class CreateInvitationsResultDto {
  invited!: string[];
  alreadyMember!: string[];
  alreadyInvited!: string[];
  invalidEmail!: string[];
}
