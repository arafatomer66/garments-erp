import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  CreateEmployeeDto as ICreateEmployeeDto,
  EmployeeGender,
  EmployeeStatus,
  EmploymentType,
  PayType,
  SkillGrade,
  UpdateEmployeeDto as IUpdateEmployeeDto,
} from '@org/shared-types';

const GENDERS: EmployeeGender[] = ['male', 'female', 'other'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['permanent', 'contractual', 'casual', 'intern'];
const PAY_TYPES: PayType[] = ['monthly', 'piece_rate', 'daily', 'hourly'];
const SKILL_GRADES: SkillGrade[] = [
  'grade_1',
  'grade_2',
  'grade_3',
  'grade_4',
  'grade_5',
  'grade_6',
  'grade_7',
];
const STATUSES: EmployeeStatus[] = ['active', 'on_leave', 'terminated', 'resigned'];

export class CreateEmployeeDto implements ICreateEmployeeDto {
  @IsString() @Length(1, 40) employeeCode!: string;
  @IsString() @Length(1, 120) fullName!: string;
  @IsOptional() @IsString() @MaxLength(40) nidNumber?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: EmployeeGender;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsUUID() departmentId?: string | null;
  @IsOptional() @IsString() @MaxLength(80) designation?: string;
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: EmploymentType;
  @IsOptional() @IsIn(PAY_TYPES) payType?: PayType;
  @IsOptional() @IsIn(SKILL_GRADES) skillGrade?: SkillGrade | null;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber() @Min(0) houseRent?: number;
  @IsOptional() @IsNumber() @Min(0) medicalAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) transportAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) foodAllowance?: number;
  @IsOptional() @IsDateString() joinDate?: string;
  @IsOptional() @IsDateString() leaveDate?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: EmployeeStatus;
  @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @IsOptional() @IsString() @MaxLength(40) bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(20) bkashNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto implements IUpdateEmployeeDto {
  @IsOptional() @IsString() @Length(1, 40) employeeCode?: string;
  @IsOptional() @IsString() @Length(1, 120) fullName?: string;
  @IsOptional() @IsString() @MaxLength(40) nidNumber?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: EmployeeGender;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsUUID() departmentId?: string | null;
  @IsOptional() @IsString() @MaxLength(80) designation?: string;
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: EmploymentType;
  @IsOptional() @IsIn(PAY_TYPES) payType?: PayType;
  @IsOptional() @IsIn(SKILL_GRADES) skillGrade?: SkillGrade | null;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber() @Min(0) houseRent?: number;
  @IsOptional() @IsNumber() @Min(0) medicalAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) transportAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) foodAllowance?: number;
  @IsOptional() @IsDateString() joinDate?: string;
  @IsOptional() @IsDateString() leaveDate?: string | null;
  @IsOptional() @IsIn(STATUSES) status?: EmployeeStatus;
  @IsOptional() @IsString() @MaxLength(80) bankName?: string;
  @IsOptional() @IsString() @MaxLength(40) bankAccount?: string;
  @IsOptional() @IsString() @MaxLength(20) bkashNumber?: string;
  @IsOptional() @IsString() notes?: string;
}
