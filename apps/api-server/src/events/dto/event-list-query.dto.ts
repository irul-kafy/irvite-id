import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class EventListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['all', 'active', 'archived'])
  filter?: 'all' | 'active' | 'archived';
}
