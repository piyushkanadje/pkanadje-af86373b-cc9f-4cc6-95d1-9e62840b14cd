import { Component, inject, OnInit, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, OrganizationService } from '../../core/services';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  userId: string;
  organizationId: string | null;
  details: Record<string, unknown> | null;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface PaginatedResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
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

  // Pagination state
  currentPage = signal(1);
  totalItems = signal(0);
  totalPages = signal(0);
  pageSize = signal(10);

  // Computed pagination helpers
  startItem = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endItem = computed(() => {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.totalItems());
  });

  canGoPrevious = computed(() => this.currentPage() > 1);
  canGoNext = computed(() => this.currentPage() < this.totalPages());

  // Generate page numbers for display
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  });

  private lastOrgId: string | null = null;

  constructor() {
    // Effect to auto-reload when organization changes
    effect(() => {
      const orgId = this.organizationService.currentOrg()?.id;
      if (orgId && orgId !== this.lastOrgId) {
        this.lastOrgId = orgId;
        this.currentPage.set(1);
        this.loadAuditLogs();
      }
    });
  }

  ngOnInit(): void {
    // Initial load handled by effect
  }

  loadAuditLogs(): void {
    const orgId = this.organizationService.currentOrg()?.id;
    if (!orgId) {
      this.error.set('No organization selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const page = this.currentPage();
    const limit = this.pageSize();
    const url = `/api/v1/audit-log?organizationId=${orgId}&page=${page}&limit=${limit}`;

    this.http.get<PaginatedResponse>(url).subscribe({
      next: (response) => {
        this.auditLogs.set(response.data);
        this.totalItems.set(response.total);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load audit logs');
        this.isLoading.set(false);
      },
    });
  }

  goToPage(page: number | string): void {
    if (typeof page === 'string') return; // Ignore '...' clicks
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadAuditLogs();
  }

  previousPage(): void {
    if (this.canGoPrevious()) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadAuditLogs();
    }
  }

  nextPage(): void {
    if (this.canGoNext()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadAuditLogs();
    }
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.loadAuditLogs();
  }

  showDetails(log: AuditLogEntry): void {
    this.selectedLog.set(log);
  }

  closeDetails(): void {
    this.selectedLog.set(null);
  }
}
