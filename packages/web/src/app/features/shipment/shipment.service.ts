import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateExportDocumentDto,
  CreatePackingListDto,
  CreateShipmentDto,
  ExportDocument,
  PackingList,
  Shipment,
  UpdateExportDocumentDto,
  UpdatePackingListDto,
  UpdateShipmentDto,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ShipmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/shipment`;

  listPackingLists(): Observable<PackingList[]> {
    return this.http.get<PackingList[]>(`${this.base}/packing-lists`);
  }
  getPackingList(id: string): Observable<PackingList> {
    return this.http.get<PackingList>(`${this.base}/packing-lists/${id}`);
  }
  createPackingList(dto: CreatePackingListDto): Observable<PackingList> {
    return this.http.post<PackingList>(`${this.base}/packing-lists`, dto);
  }
  updatePackingList(id: string, dto: UpdatePackingListDto): Observable<PackingList> {
    return this.http.patch<PackingList>(`${this.base}/packing-lists/${id}`, dto);
  }
  deletePackingList(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/packing-lists/${id}`);
  }

  listShipments(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.base}/shipments`);
  }
  createShipment(dto: CreateShipmentDto): Observable<Shipment> {
    return this.http.post<Shipment>(`${this.base}/shipments`, dto);
  }
  updateShipment(id: string, dto: UpdateShipmentDto): Observable<Shipment> {
    return this.http.patch<Shipment>(`${this.base}/shipments/${id}`, dto);
  }
  deleteShipment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/shipments/${id}`);
  }

  listExportDocuments(): Observable<ExportDocument[]> {
    return this.http.get<ExportDocument[]>(`${this.base}/export-documents`);
  }
  createExportDocument(dto: CreateExportDocumentDto): Observable<ExportDocument> {
    return this.http.post<ExportDocument>(`${this.base}/export-documents`, dto);
  }
  updateExportDocument(id: string, dto: UpdateExportDocumentDto): Observable<ExportDocument> {
    return this.http.patch<ExportDocument>(`${this.base}/export-documents/${id}`, dto);
  }
  deleteExportDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/export-documents/${id}`);
  }
}
