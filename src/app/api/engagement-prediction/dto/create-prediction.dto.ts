import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
  IsDateString,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Re-using and adapting types from EngagementTypes.ts for API validation

enum Platform {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
}

enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  CAROUSEL = 'carousel',
  REEL = 'reel',
  SHORT = 'short',
}

class ContentMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  hashtags: string[] = [];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7200) // Max 2 hours
  duration?: number;

  @IsEnum(ContentType)
  contentType: ContentType = ContentType.VIDEO;

  @IsOptional()
  @IsDateString()
  scheduledPublishTime?: string;
}

class TargetAudienceDto {
  @IsOptional()
  // Basic validation, could be more complex (e.g. key-value pairs)
  demographics?: Record<string, number>; 

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  interests?: string[];
}

export class CreatePredictionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  userId?: string;

  @IsEnum(Platform)
  platform: Platform = Platform.TIKTOK;

  @ValidateNested()
  @Type(() => ContentMetadataDto)
  contentMetadata: ContentMetadataDto = new ContentMetadataDto();

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetAudienceDto)
  targetAudience?: TargetAudienceDto;
} 