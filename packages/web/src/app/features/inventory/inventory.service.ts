import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  BinLocation,
  CreateBinLocationDto,
  CreateFabricInspectionDto,
  CreateStockLotDto,
  CreateStockMovementDto,
  CreateWarehouseDto,
  FabricInspection,
  IssueFifoDto,
  StockLot,
  StockMovement,
  UpdateBinLocationDto,
  UpdateFabricInspectionDto,
  UpdateStockLotDto,
  UpdateWarehouseDto,
  Warehouse,
} from '@org/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/inventory`;

  listWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.base}/warehouses`);
  }
  createWarehouse(dto: CreateWarehouseDto): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.base}/warehouses`, dto);
  }
  updateWarehouse(id: string, dto: UpdateWarehouseDto): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.base}/warehouses/${id}`, dto);
  }
  deleteWarehouse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/warehouses/${id}`);
  }

  listBins(warehouseId?: string): Observable<BinLocation[]> {
    const url = warehouseId
      ? `${this.base}/bins?warehouseId=${encodeURIComponent(warehouseId)}`
      : `${this.base}/bins`;
    return this.http.get<BinLocation[]>(url);
  }
  createBin(dto: CreateBinLocationDto): Observable<BinLocation> {
    return this.http.post<BinLocation>(`${this.base}/bins`, dto);
  }
  updateBin(id: string, dto: UpdateBinLocationDto): Observable<BinLocation> {
    return this.http.patch<BinLocation>(`${this.base}/bins/${id}`, dto);
  }
  deleteBin(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/bins/${id}`);
  }

  listInspections(): Observable<FabricInspection[]> {
    return this.http.get<FabricInspection[]>(`${this.base}/inspections`);
  }
  createInspection(dto: CreateFabricInspectionDto): Observable<FabricInspection> {
    return this.http.post<FabricInspection>(`${this.base}/inspections`, dto);
  }
  updateInspection(
    id: string,
    dto: UpdateFabricInspectionDto,
  ): Observable<FabricInspection> {
    return this.http.patch<FabricInspection>(`${this.base}/inspections/${id}`, dto);
  }
  deleteInspection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/inspections/${id}`);
  }

  listLots(): Observable<StockLot[]> {
    return this.http.get<StockLot[]>(`${this.base}/lots`);
  }
  createLot(dto: CreateStockLotDto): Observable<StockLot> {
    return this.http.post<StockLot>(`${this.base}/lots`, dto);
  }
  updateLot(id: string, dto: UpdateStockLotDto): Observable<StockLot> {
    return this.http.patch<StockLot>(`${this.base}/lots/${id}`, dto);
  }
  deleteLot(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lots/${id}`);
  }

  listMovements(lotId?: string): Observable<StockMovement[]> {
    const url = lotId
      ? `${this.base}/movements?lotId=${encodeURIComponent(lotId)}`
      : `${this.base}/movements`;
    return this.http.get<StockMovement[]>(url);
  }
  createMovement(dto: CreateStockMovementDto): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.base}/movements`, dto);
  }
  issueFifo(dto: IssueFifoDto): Observable<StockMovement[]> {
    return this.http.post<StockMovement[]>(`${this.base}/movements/issue-fifo`, dto);
  }
}
