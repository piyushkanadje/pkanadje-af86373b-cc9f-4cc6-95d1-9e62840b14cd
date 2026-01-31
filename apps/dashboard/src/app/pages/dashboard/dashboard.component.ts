import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AuthService,
  TaskService,
} from '../../core/services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly taskService = inject(TaskService);

  ngOnInit(): void {
    // Load tasks when dashboard loads
    this.taskService.loadTasks();
  }
}
