import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Buyer,
  CreateBuyerDto,
  CreateItemDto,
  CreateSupplierDto,
  Item,
  Supplier,
  UpdateBuyerDto,
  UpdateItemDto,
  UpdateSupplierDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MastersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/masters`;

  listBuyers(): Observable<Buyer[]> {
    return this.http.get<Buyer[]>(`${this.base}/buyers`);
  }
  createBuyer(dto: CreateBuyerDto): Observable<Buyer> {
    return this.http.post<Buyer>(`${this.base}/buyers`, dto);
  }
  updateBuyer(id: string, dto: UpdateBuyerDto): Observable<Buyer> {
    return this.http.patch<Buyer>(`${this.base}/buyers/${id}`, dto);
  }
  deleteBuyer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/buyers/${id}`);
  }

  listSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.base}/suppliers`);
  }
  createSupplier(dto: CreateSupplierDto): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.base}/suppliers`, dto);
  }
  updateSupplier(id: string, dto: UpdateSupplierDto): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.base}/suppliers/${id}`, dto);
  }
  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/suppliers/${id}`);
  }

  listItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.base}/items`);
  }
  createItem(dto: CreateItemDto): Observable<Item> {
    return this.http.post<Item>(`${this.base}/items`, dto);
  }
  updateItem(id: string, dto: UpdateItemDto): Observable<Item> {
    return this.http.patch<Item>(`${this.base}/items/${id}`, dto);
  }
  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${id}`);
  }
}
