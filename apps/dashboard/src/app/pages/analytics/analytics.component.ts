import { Component, OnInit, inject, signal, effect, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { TaskService } from '../../core/services/task.service';
import { ThemeService } from '../../core/services/theme.service';

/**
 * ============================================================================
 * ANALYTICS COMPONENT - Chart.js with Dynamic Theme Support
 * ============================================================================
 * 
 * ARCHITECTURAL DECISIONS:
 * 
 * 1. NG2-CHARTS INTEGRATION:
 *    - Uses BaseChartDirective for declarative Chart.js binding
 *    - Reactive data updates through signals and computed properties
 * 
 * 2. THEME-AWARE CHART COLORS:
 *    - Uses effect() to watch ThemeService.isDarkMode
 *    - Dynamically updates chart colors without full re-render
 *    - Background, grid lines, and text colors all adapt
 * 
 * 3. SIGNAL-BASED DATA:
 *    - Uses effect() to watch TaskService computed signals
 *    - Chart updates automatically when tasks change
 * 
 * 4. RESPONSIVE DESIGN:
 *    - Charts resize with container
 *    - Mobile-friendly layout with stacked cards
 * 
 * ============================================================================
 */

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Track your productivity and task completion</p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- To Do Card -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">To Do</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ todoCount() }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- In Progress Card -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ inProgressCount() }}</p>
            </div>
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Done Card -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">{{ doneCount() }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Bar Chart -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Distribution</h2>
          <div class="h-64">
            <canvas baseChart
              [data]="barChartData"
              [options]="barChartOptions"
              [type]="barChartType">
            </canvas>
          </div>
        </div>

        <!-- Doughnut Chart -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completion Rate</h2>
          <div class="h-64 flex items-center justify-center">
            <canvas baseChart
              [data]="doughnutChartData"
              [options]="doughnutChartOptions"
              [type]="doughnutChartType">
            </canvas>
          </div>
          <div class="mt-4 text-center">
            <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ completionRate() }}%</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
          </div>
        </div>
      </div>

      <!-- Productivity Insights -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Productivity Insights</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ totalTasks() }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Efficiency</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white">
                @if (totalTasks() > 0) {
                  {{ getEfficiencyLabel() }}
                } @else {
                  No data
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  private readonly taskService = inject(TaskService);
  private readonly themeService = inject(ThemeService);

  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;
  private chartsReady = false;

  // Signals for task counts
  todoCount = signal(0);
  inProgressCount = signal(0);
  doneCount = signal(0);
  totalTasks = signal(0);

  // Computed signals
  completionRate = signal(0);

  // Chart types - using 'as const' for literal type inference in template
  barChartType = 'bar' as const;
  doughnutChartType = 'doughnut' as const;

  // Bar Chart Configuration
  barChartData: ChartData<'bar'> = {
    labels: ['To Do', 'In Progress', 'Done'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
        borderColor: ['#2563EB', '#D97706', '#059669'],
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#6B7280'
        },
        grid: {
          color: '#E5E7EB'
        }
      },
      x: {
        ticks: {
          color: '#6B7280'
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Doughnut Chart Configuration
  doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Completed', 'Remaining'],
    datasets: [
      {
        data: [0, 100],
        backgroundColor: ['#10B981', '#E5E7EB'],
        borderWidth: 0,
      }
    ]
  };

  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      }
    }
  };

  constructor() {
    // Effect to update chart colors based on theme
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.updateChartTheme(isDark);
    });
    
    // Effect to watch task service signals and update charts
    effect(() => {
      const todo = this.taskService.todoTasks().length;
      const inProgress = this.taskService.inProgressTasks().length;
      const done = this.taskService.doneTasks().length;
      const total = todo + inProgress + done;
      
      // Update local signals
      this.todoCount.set(todo);
      this.inProgressCount.set(inProgress);
      this.doneCount.set(done);
      this.totalTasks.set(total);
      
      // Calculate completion rate
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      this.completionRate.set(rate);
      
      // Update charts
      this.updateCharts(todo, inProgress, done, rate);
    });
  }

  ngOnInit(): void {
    // Load tasks if not already loaded
    this.taskService.loadTasks();
  }

  ngAfterViewInit(): void {
    // Charts are now ready
    this.chartsReady = true;
    // Trigger initial update
    setTimeout(() => this.updateAllCharts(), 0);
  }

  /**
   * Update all charts
   */
  private updateAllCharts(): void {
    if (this.chartsReady && this.charts) {
      this.charts.forEach(chart => chart.update());
    }
  }

  /**
   * Update all charts with current data
   */
  private updateCharts(todo: number, inProgress: number, done: number, rate: number): void {
    // Update bar chart data
    this.barChartData.datasets[0].data = [todo, inProgress, done];

    // Update doughnut chart data
    this.doughnutChartData.datasets[0].data = [rate, 100 - rate];

    // Force all charts to update
    this.updateAllCharts();
  }

  /**
   * Update chart colors based on theme
   */
  private updateChartTheme(isDark: boolean): void {
    const textColor = isDark ? '#E5E7EB' : '#6B7280';
    const gridColor = isDark ? '#374151' : '#E5E7EB';
    const doughnutBg = isDark ? '#374151' : '#E5E7EB';

    // Update bar chart options - use type assertion for Chart.js scale options
    const yScale = this.barChartOptions?.scales?.['y'] as { ticks?: { color?: string }; grid?: { color?: string } } | undefined;
    const xScale = this.barChartOptions?.scales?.['x'] as { ticks?: { color?: string } } | undefined;
    
    if (yScale) {
      if (yScale.ticks) yScale.ticks.color = textColor;
      if (yScale.grid) yScale.grid.color = gridColor;
    }
    if (xScale?.ticks) {
      xScale.ticks.color = textColor;
    }

    // Update doughnut chart colors
    this.doughnutChartData.datasets[0].backgroundColor = ['#10B981', doughnutBg];

    // Force all charts to update
    this.updateAllCharts();
  }

  /**
   * Get efficiency label based on completion rate
   */
  getEfficiencyLabel(): string {
    const rate = this.completionRate();
    if (rate >= 80) return 'Excellent 🚀';
    if (rate >= 60) return 'Good 👍';
    if (rate >= 40) return 'Average 📊';
    if (rate >= 20) return 'Needs Work 💪';
    return 'Getting Started 🌱';
  }
}
