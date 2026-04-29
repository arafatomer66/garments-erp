import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  ConvertPrToPoDto,
  CreateGoodsReceiptNoteDto,
  CreateLetterOfCreditDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequisitionDto,
  GoodsReceiptNote,
  LetterOfCredit,
  PurchaseOrder,
  PurchaseRequisition,
  UpdateGoodsReceiptNoteDto,
  UpdateLetterOfCreditDto,
  UpdatePurchaseOrderDto,
  UpdatePurchaseRequisitionDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProcurementService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/procurement`;

  listPrs(): Observable<PurchaseRequisition[]> {
    return this.http.get<PurchaseRequisition[]>(`${this.base}/prs`);
  }
  createPr(dto: CreatePurchaseRequisitionDto): Observable<PurchaseRequisition> {
    return this.http.post<PurchaseRequisition>(`${this.base}/prs`, dto);
  }
  updatePr(id: string, dto: UpdatePurchaseRequisitionDto): Observable<PurchaseRequisition> {
    return this.http.patch<PurchaseRequisition>(`${this.base}/prs/${id}`, dto);
  }
  deletePr(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/prs/${id}`);
  }

  listPos(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.base}/pos`);
  }
  createPo(dto: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/pos`, dto);
  }
  updatePo(id: string, dto: UpdatePurchaseOrderDto): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/pos/${id}`, dto);
  }
  deletePo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/pos/${id}`);
  }
  convertPrToPo(dto: ConvertPrToPoDto): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.base}/pos/convert`, dto);
  }

  listGrns(): Observable<GoodsReceiptNote[]> {
    return this.http.get<GoodsReceiptNote[]>(`${this.base}/grns`);
  }
  createGrn(dto: CreateGoodsReceiptNoteDto): Observable<GoodsReceiptNote> {
    return this.http.post<GoodsReceiptNote>(`${this.base}/grns`, dto);
  }
  updateGrn(id: string, dto: UpdateGoodsReceiptNoteDto): Observable<GoodsReceiptNote> {
    return this.http.patch<GoodsReceiptNote>(`${this.base}/grns/${id}`, dto);
  }
  deleteGrn(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/grns/${id}`);
  }

  listLcs(): Observable<LetterOfCredit[]> {
    return this.http.get<LetterOfCredit[]>(`${this.base}/lcs`);
  }
  createLc(dto: CreateLetterOfCreditDto): Observable<LetterOfCredit> {
    return this.http.post<LetterOfCredit>(`${this.base}/lcs`, dto);
  }
  updateLc(id: string, dto: UpdateLetterOfCreditDto): Observable<LetterOfCredit> {
    return this.http.patch<LetterOfCredit>(`${this.base}/lcs/${id}`, dto);
  }
  deleteLc(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lcs/${id}`);
  }
}
