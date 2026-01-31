import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, OrganizationService } from '../../core/services';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
})
export class AuditLogComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly organizationService = inject(OrganizationService);
  private readonly http = inject(HttpClient);

  auditLogs = signal<AuditLogEntry[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedLog = signal<AuditLogEntry | null>(null);
  currentPage = signal(1);
  pageSize = 20;

  selectedEntityType = '';
  selectedAction = '';

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) {
      this.error.set('No organization selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    let url = `/api/audit?organizationId=${orgId}&page=${this.currentPage()}&limit=${this.pageSize}`;
    if (this.selectedEntityType) {
      url += `&entityType=${this.selectedEntityType}`;
    }
    if (this.selectedAction) {
      url += `&action=${this.selectedAction}`;
    }

    this.http.get<AuditLogEntry[]>(url).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load audit logs');
        this.isLoading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.selectedEntityType = '';
    this.selectedAction = '';
    this.currentPage.set(1);
    this.loadAuditLogs();
  }

  showDetails(log: AuditLogEntry): void {
    this.selectedLog.set(log);
  }

  closeDetails(): void {
    this.selectedLog.set(null);
  }

  loadPrevious(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadAuditLogs();
    }
  }

  loadNext(): void {
    this.currentPage.update(p => p + 1);
    this.loadAuditLogs();
  }
}
