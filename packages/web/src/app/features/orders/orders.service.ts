import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  BuyerOrder,
  CreateBuyerOrderDto,
  UpdateBuyerOrderDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/orders`;

  list(): Observable<BuyerOrder[]> {
    return this.http.get<BuyerOrder[]>(this.base);
  }
  findOne(id: string): Observable<BuyerOrder> {
    return this.http.get<BuyerOrder>(`${this.base}/${id}`);
  }
  create(dto: CreateBuyerOrderDto): Observable<BuyerOrder> {
    return this.http.post<BuyerOrder>(this.base, dto);
  }
  update(id: string, dto: UpdateBuyerOrderDto): Observable<BuyerOrder> {
    return this.http.patch<BuyerOrder>(`${this.base}/${id}`, dto);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
