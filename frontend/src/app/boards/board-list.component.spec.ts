import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { BoardListComponent } from './board-list.component';

describe('BoardListComponent', () => {
  let http: HttpTestingController;
  const username = signal<string | null>('bob');
  const isAdmin = signal(false);

  beforeEach(async () => {
    username.set('bob');
    isAdmin.set(false);
    await TestBed.configureTestingModule({
      imports: [BoardListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { username, isAdmin } }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(): HTMLElement {
    const fixture = TestBed.createComponent(BoardListComponent);
    fixture.detectChanges();
    http.expectOne('/api/boards').flush([
      { id: 1, name: 'Mine', owner: 'bob' },
      { id: 2, name: 'Shared', owner: 'alice' }
    ]);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('shows owned and shared boards, flagging the shared one', () => {
    const el = load();
    const rows = el.querySelectorAll('.board');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.badge')).toBeNull();
    expect(rows[1].querySelector('.badge')?.textContent).toContain('Shared with you');
  });

  it('offers Delete only on boards the user owns', () => {
    const rows = load().querySelectorAll('.board');
    expect(rows[0].querySelector('button.danger')).not.toBeNull();
    expect(rows[1].querySelector('button.danger')).toBeNull();
  });

  it('offers Delete on every board to an admin, without a "shared" badge', () => {
    username.set('carol');
    isAdmin.set(true);
    const rows = load().querySelectorAll('.board');
    expect(rows[0].querySelector('button.danger')).not.toBeNull();
    expect(rows[1].querySelector('button.danger')).not.toBeNull();
    expect(rows[1].querySelector('.badge')).toBeNull();
  });
});
